import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchTeacherClassByIdApi,
  fetchTeacherSectionsApi,
  fetchTeacherSubjectsApi,
  fetchTeacherAssignmentsApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam, encodeParam } from '../../../utils/idHelper';

const TeacherAssignmentSubjectView = () => {
  const { teacher } = useSelector((state) => state.teacherAuth);
  const teacherId = teacher?.id || teacher?.teacherId;

  const { classId: rawClassId, sectionId: rawSectionId } = useParams();
  const classId = decodeParam(rawClassId);
  const sectionId = decodeParam(rawSectionId);

  const encodedClassId = encodeParam(classId);
  const encodedSectionId = encodeParam(sectionId);

  const [classInfo, setClassInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [rawClassId, rawSectionId, teacherId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, secRes, subRes, asgRes] = await Promise.all([
        fetchTeacherClassByIdApi(classId).catch(() => null),
        fetchTeacherSectionsApi(classId).catch(() => ({ data: [] })),
        fetchTeacherSubjectsApi({ classId }).catch(() => ({ data: [] })),
        fetchTeacherAssignmentsApi({ class_id: classId, section_id: sectionId, status: 1 }).catch(() => ({ data: [] })),
      ]);

      let clsData = clsRes?.data || clsRes;
      setClassInfo(clsData);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      const currentSec = secList.find((s) => String(s.id) === String(sectionId));
      setSectionInfo(currentSec);

      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      const activeSubjects = subList.filter((s) => Number(s.status) === 1);
      setSubjects(activeSubjects.length > 0 ? activeSubjects : subList);

      const asgList = Array.isArray(asgRes?.data)
        ? asgRes.data
        : Array.isArray(asgRes?.data?.assignments)
        ? asgRes.data.assignments
        : Array.isArray(asgRes)
        ? asgRes
        : [];
      setAssignments(asgList.filter((a) => Number(a.status) === 1));
    } catch (err) {
      console.error('Failed to load assignment subjects:', err);
      toast.error('Failed to load assigned subjects.');
    } finally {
      setLoading(false);
    }
  };

  const className = classInfo?.class_name || classId;
  const sectionName = sectionInfo?.section_name || sectionId;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Assigned Subjects</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/teacher/academics/assignments">Class Assignment</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`/teacher/academics/assignments/section/${encodedClassId}`}>
                  Sections
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Subjects
              </li>
            </ol>
          </nav>
        </div>
        <div>
          <Link
            to={`/teacher/academics/assignments/section/${encodedClassId}`}
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="fa-solid fa-arrow-left me-1"></i> Back to Sections
          </Link>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {/* Section Header Card */}
          <div className="card shadow-sm border mb-4">
            <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
              <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                <i className="fa-solid fa-chalkboard-user me-2 text-primary fs-20"></i>
                Class : {className} - Section {sectionName}
              </h5>
              <span className="badge bg-white text-primary border px-3 py-2 fs-13 fw-semibold shadow-2xs">
                <i className="fa-solid fa-book me-1"></i> {subjects.length} Assigned Subject(s)
              </span>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="card p-5 text-center shadow-sm border-0">
              <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
              <p className="text-muted mb-0">Loading assigned subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="card p-5 text-center shadow-sm border-0">
              <div
                className="avatar avatar-xl bg-light rounded-circle text-muted mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: '60px', height: '60px' }}
              >
                <i className="fa-solid fa-book-open fs-28"></i>
              </div>
              <h5 className="text-dark fw-bold mb-1">No Assigned Subjects</h5>
              <p className="text-muted fs-13 mb-0">
                There are no active subjects assigned for this class and section.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {subjects.map((sub) => {
                const subjectAssignments = assignments.filter(
                  (a) => Number(a.subject_id) === Number(sub.id)
                );
                const count = subjectAssignments.length;

                return (
                  <div key={sub.id} className="col-md-6 col-lg-4 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100 hover-top transition-all">
                      <div className="card-body p-4 bg-white d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div
                              className="avatar avatar-md bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '45px', height: '45px' }}
                            >
                              <i className="fa-solid fa-book fs-18"></i>
                            </div>
                            <span className="badge bg-warning text-dark fs-12 fw-bold px-2.5 py-1">
                              {count} Assignment(s)
                            </span>
                          </div>
                          <h5 className="fw-bold text-dark mb-1">{sub.subject_name}</h5>
                          <p className="text-muted small mb-4">
                            Subject Code: {sub.subject_code || 'N/A'}
                          </p>
                        </div>

                        <div className="d-flex gap-2">
                          <Link
                            to={`/teacher/academics/assignments/addForm/${encodeParam(sub.id)}/${encodedClassId}/${encodedSectionId}`}
                            className="btn btn-sm btn-primary flex-fill rounded-pill fw-semibold"
                          >
                            <i className="fa-solid fa-plus me-1"></i> Add New
                          </Link>
                          <Link
                            to={`/teacher/academics/assignments/viewAssignment/${encodeParam(sub.id)}/${encodedClassId}/${encodedSectionId}`}
                            className="btn btn-sm btn-outline-dark flex-fill rounded-pill fw-semibold"
                          >
                            <i className="fa-solid fa-list me-1"></i> View All
                          </Link>
                        </div>
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

export default TeacherAssignmentSubjectView;
