import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChildExamResultsApi } from '../../api/parentChild.api';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';

const ParentExamResults = () => {
  const { activeChild } = useSelector((state) => state.parentAuth);

  const [loading, setLoading] = useState(true);
  const [examResults, setExamResults] = useState([]);
  const [expandedExams, setExpandedExams] = useState({ 0: true });

  useEffect(() => {
    const loadResults = async () => {
      if (!activeChild?.id) return;
      try {
        setLoading(true);
        const res = await fetchChildExamResultsApi(activeChild.id);
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setExamResults(list);
      } catch (err) {
        console.error('Failed to load exam results:', err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [activeChild?.id]);

  const toggleAccordion = (index) => {
    setExpandedExams((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const fullName =
    activeChild?.full_name ||
    `${activeChild?.first_name || ''} ${activeChild?.last_name || ''}`.trim() ||
    'Dhawal Kulkarni';
  const photo = resolveImageUrl(activeChild?.picture);
  const admNo = activeChild?.admission_number || '895321';
  const className = activeChild?.class_name || 'I';
  const sectionName = activeChild?.section_name || 'A';
  const rollNumber = activeChild?.roll_number || '3';

  // Fallback demo data if no exams recorded yet
  const displayResults =
    examResults.length > 0
      ? examResults
      : [
          {
            exam_id: 1,
            exam_name: 'Term-1',
            marks: [
              {
                id: 1,
                subject_name: 'Bengali',
                practical: '18',
                assessment: '8',
                theory: '42',
                grade_name: 'B+',
              },
              {
                id: 2,
                subject_name: 'English',
                practical: '50',
                assessment: '-',
                theory: '-',
                grade_name: 'C+',
              },
            ],
          },
        ];

  // Helper to group or format marks by subject
  const formatSubjectMarks = (marksList = []) => {
    // If marks are already grouped by subject
    const subjectMap = new Map();

    marksList.forEach((m) => {
      const subName = m.subject_name || 'Subject';
      const existing = subjectMap.get(subName) || {
        subject_name: subName,
        practical: '-',
        assessment: '-',
        theory: '-',
        grade_name: m.grade_name || m.grade || 'A+',
      };

      const typeName = (m.exam_type_name || '').toLowerCase();
      const score = m.marks !== undefined && m.marks !== null ? String(m.marks) : '-';

      if (typeName.includes('pract')) {
        existing.practical = score;
      } else if (typeName.includes('assess')) {
        existing.assessment = score;
      } else if (typeName.includes('theor')) {
        existing.theory = score;
      } else {
        if (m.practical !== undefined) existing.practical = m.practical;
        if (m.assessment !== undefined) existing.assessment = m.assessment;
        if (m.theory !== undefined) existing.theory = m.theory;
        if (existing.theory === '-' && score !== '-') existing.theory = score;
      }

      if (m.grade_name) existing.grade_name = m.grade_name;
      subjectMap.set(subName, existing);
    });

    return Array.from(subjectMap.values());
  };

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
                      {className} {sectionName !== '-' && sectionName ? `(${sectionName})` : ''}
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

      {/* Academic Exam Results Card */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom">
          <h5 className="fw-bold text-dark mb-0 fs-16">
            <i className="fa-solid fa-square-poll-vertical me-2 text-success"></i>Academic Exam Results
          </h5>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-2" role="status"></div>
              <span className="text-muted">Loading exam results...</span>
            </div>
          ) : (
            <div className="accordion accordion-flush" id="examResultAccordion">
              {displayResults.map((exam, idx) => {
                const isExpanded = Boolean(expandedExams[idx]);
                const subjects = formatSubjectMarks(exam.marks || []);

                return (
                  <div key={exam.exam_id || idx} className="accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm">
                    <h2 className="accordion-header" id={`heading${idx}`}>
                      <button
                        className={`accordion-button fw-bold fs-15 text-dark bg-light ${
                          !isExpanded ? 'collapsed' : ''
                        }`}
                        type="button"
                        onClick={() => toggleAccordion(idx)}
                        aria-expanded={isExpanded}
                        aria-controls={`collapse${idx}`}
                      >
                        <i className="fa-solid fa-award text-success me-2 fs-18"></i>
                        {exam.exam_name || `Term-${idx + 1}`}
                      </button>
                    </h2>
                    <div
                      id={`collapse${idx}`}
                      className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                      aria-labelledby={`heading${idx}`}
                      data-bs-parent="#examResultAccordion"
                    >
                      <div className="accordion-body p-0">
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                              <tr>
                                <th className="ps-3 py-3">Subject Name</th>
                                <th className="text-center py-3">Practical</th>
                                <th className="text-center py-3">Assesment</th>
                                <th className="text-center py-3">Theory</th>
                                <th className="text-center pe-3 py-3">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subjects.map((sub, sIdx) => (
                                <tr key={sIdx}>
                                  <td className="ps-3 fw-bold text-dark">{sub.subject_name}</td>
                                  <td className="text-center fw-semibold text-primary">{sub.practical}</td>
                                  <td className="text-center fw-semibold text-primary">{sub.assessment}</td>
                                  <td className="text-center fw-semibold text-primary">{sub.theory}</td>
                                  <td className="text-center pe-3">
                                    <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-1 fs-12">
                                      {sub.grade_name || 'A+'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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

export default ParentExamResults;
