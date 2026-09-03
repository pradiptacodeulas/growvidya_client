import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchTeacherClassByIdApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const TeacherAssignmentSectionView = () => {
  const { teacher } = useSelector((state) => state.teacherAuth);
  const teacherId = teacher?.id || teacher?.teacherId;

  const { classId: rawClassId } = useParams();
  const classId = decodeParam(rawClassId);
  const encodedClassId = encodeParam(classId);

  const [classInfo, setClassInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassAndSections();
  }, [rawClassId, teacherId]);

  const loadClassAndSections = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes] = await Promise.all([
        fetchTeacherClassByIdApi(classId).catch(() => null),
        fetchTeacherSectionsApi(classId).catch(() => ({ data: [] })),
      ]);

      let clsData = clsRes?.data || clsRes;
      if (!clsData) {
        const allClasses = await fetchTeacherClassesApi({ teacher_id: teacherId, status: 1, activeOnly: true });
        const list = Array.isArray(allClasses?.data) ? allClasses.data : Array.isArray(allClasses) ? allClasses : [];
        clsData = list.find((c) => String(c.id) === String(classId));
      }
      setClassInfo(clsData);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const classSections = secList.filter(
        (s) => String(s.class_id) === String(classId) && Number(s.status) === 1
      );
      setSections(classSections.length > 0 ? classSections : secList.filter((s) => Number(s.status) === 1));
    } catch (err) {
      console.error('Failed to load class sections:', err);
      toast.error('Failed to load class sections.');
    } finally {
      setLoading(false);
    }
  };

  const className = classInfo?.class_name || classId;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Sections</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/teacher/academics/assignments">Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Sections
              </li>
            </ol>
          </nav>
        </div>
        <div>
          <Link
            to="/teacher/academics/assignments"
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="fa-solid fa-arrow-left me-1"></i> Back to Classes
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      {/* Class Banner */}
      <div className="row">
        <div className="col-md-12">
          {/* Class Header Card */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
              <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                <i className="fa-solid fa-chalkboard-user me-2 text-primary fs-20"></i>
                Class {className}
              </h5>
              <span className="badge bg-white text-primary border px-3 py-2 fs-13 fw-semibold shadow-2xs">
                Select a section to manage assignments
              </span>
            </div>
          </div>

          {/* Sections Grid */}
          {loading ? (
            <div className="card p-5 text-center shadow-sm border-0">
              <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
              <p className="text-muted mb-0">Loading sections...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="card p-5 text-center shadow-sm border-0">
              <h5 className="text-dark fw-bold mb-1">No Active Sections Found</h5>
              <p className="text-muted fs-13 mb-0">
                No active sections are configured for Class {className}.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {sections.map((sec) => {
                return (
                  <div key={sec.id} className="col-md-6 col-lg-4 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100 hover-top transition-all">
                      <div className="card-body p-4 bg-white text-center">
                        <div
                          className="avatar avatar-md bg-primary-subtle text-primary rounded-circle mb-3 mx-auto d-flex align-items-center justify-content-center"
                          style={{ width: '50px', height: '50px' }}
                        >
                          <i className="fa-solid fa-layer-group fs-20"></i>
                        </div>
                        <h5 className="fw-bold text-dark mb-1">
                          Section {sec.section_name}
                        </h5>
                        <p className="text-muted small mb-3">
                          Manage assignments for Section {sec.section_name}
                        </p>
                        <Link
                          to={`/teacher/academics/assignments/subject/${encodedClassId}/${encodeParam(sec.id)}`}
                          className="btn btn-outline-primary btn-sm w-100 rounded-pill fw-semibold"
                        >
                          Select Section <i className="fa-solid fa-arrow-right ms-1"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherAssignmentSectionView;
