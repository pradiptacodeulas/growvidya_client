import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStudentExamResultsApi } from '../../api/studentPortal.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const StudentExamResults = () => {
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [examData, setExamData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentExamResultsApi();
      const data = res?.data?.data || res?.data || [];
      setExamData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student exam results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
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
                  Academic Performance
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{studentName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  Class: <strong className="text-dark">{student?.class_name || 'Class'} {student?.section_name ? `(${student.section_name})` : ''}</strong> | Examination Marksheets & Grades
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2"></div>
          Loading examination results...
        </div>
      ) : examData.length === 0 ? (
        <div className="card border shadow-sm rounded-3 text-center py-5">
          <i className="ti ti-file-certificate fs-48 text-muted mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Exam Results Published</h5>
          <p className="text-muted fs-13 mb-0">Exam marksheets will appear here once published by the examination authority.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {examData.map((exam, eIdx) => {
            const subjects = exam.subjects || exam.marks || [];
            return (
              <div key={`exam-${exam.id || eIdx}-${eIdx}`} className="card border shadow-sm rounded-3">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h5 className="card-title mb-1 fw-bold fs-15 text-dark">
                      <i className="ti ti-certificate text-primary me-2"></i>
                      {exam.exam_name || exam.name || `Examination ${eIdx + 1}`}
                    </h5>
                    <small className="text-muted">
                      Session: {exam.academic_year || 'Current Year'} | Class: {exam.class_name || student?.class_name}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {exam.percentage && (
                      <span className="badge bg-primary-subtle text-primary fs-12 px-3 py-1">
                        Overall: {exam.percentage}%
                      </span>
                    )}
                    {exam.grade && (
                      <span className="badge bg-success-subtle text-success fs-12 px-3 py-1">
                        Grade: {exam.grade}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="fs-12 text-muted fw-bold ps-4">Subject</th>
                          <th className="fs-12 text-muted fw-bold text-center">Max Marks</th>
                          <th className="fs-12 text-muted fw-bold text-center">Pass Marks</th>
                          <th className="fs-12 text-muted fw-bold text-center">Obtained Marks</th>
                          <th className="fs-12 text-muted fw-bold text-end pe-4">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((sub, sIdx) => (
                          <tr key={`sub-${sub.id || sIdx}-${sIdx}`}>
                            <td className="ps-4 fw-semibold text-dark fs-13">
                              {sub.subject_name || sub.name || `Subject ${sIdx + 1}`}
                            </td>
                            <td className="text-center text-muted fs-13">{sub.max_marks || sub.full_marks || 100}</td>
                            <td className="text-center text-muted fs-13">{sub.pass_marks || sub.min_marks || 35}</td>
                            <td className="text-center fw-bold text-dark fs-13">
                              <span className={Number(sub.obtained_marks || sub.marks) < Number(sub.pass_marks || 35) ? 'text-danger' : 'text-success'}>
                                {sub.obtained_marks ?? sub.marks ?? 'N/A'}
                              </span>
                            </td>
                            <td className="text-end pe-4">
                              <span className="badge bg-light text-dark border fs-11">
                                {sub.grade || 'A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentExamResults;
