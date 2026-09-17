import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAcademicYearsApi,
  fetchClassesApi,
  fetchSubjectsApi,
  createSyllabusApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherAcademicYearsApi,
  fetchTeacherClassesApi,
  fetchTeacherSubjectsApi,
  createTeacherSyllabusApi,
} from '../../../api/teacherAcademic.api';

const formatAcademicYear = (ay) => {
  if (!ay) return '';
  if (ay.start_date && ay.end_date) {
    const sDate = new Date(ay.start_date);
    const eDate = new Date(ay.end_date);
    const sMonth = sDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const eMonth = eDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    return `${sMonth} - ${eMonth}`;
  }
  return ay.academic_year || `Year ${ay.id}`;
};

const AddSyllabus = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const navigate = useNavigate();

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    academic_year: '',
    class_id: '',
    subject_id: '',
    status: '1',
    lession: '',
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const fetchYears = isTeacher ? fetchTeacherAcademicYearsApi : fetchAcademicYearsApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;
      const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;

      const [ayRes, clsRes, subRes] = await Promise.all([
        fetchYears().catch(() => ({ data: [] })),
        fetchClasses().catch(() => ({ data: [] })),
        fetchSubjects().catch(() => ({ data: [] })),
      ]);

      const ayList = Array.isArray(ayRes?.data) ? ayRes.data : Array.isArray(ayRes) ? ayRes : [];
      const clsList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
      const subList = Array.isArray(subRes?.data)
        ? subRes.data
        : Array.isArray(subRes?.data?.subjects)
        ? subRes.data.subjects
        : Array.isArray(subRes)
        ? subRes
        : [];

      setAcademicYears(ayList);
      setClasses(clsList);
      setSubjects(subList);

      const currentYear =
        ayList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
        ayList[0];
      const defaultClass = clsList[0];

      setFormData((prev) => ({
        ...prev,
        academic_year: currentYear?.id ? String(currentYear.id) : '',
        class_id: defaultClass?.id ? String(defaultClass.id) : '',
      }));
    } catch (err) {
      toast.error('Failed to load master data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = formData.class_id
    ? subjects.filter((s) => String(s.class_id) === String(formData.class_id))
    : subjects;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.academic_year || !formData.class_id || !formData.subject_id || !formData.lession.trim()) {
      return toast.warning('Please fill in all required fields.');
    }

    try {
      setSubmitting(true);
      const createSyllabus = isTeacher ? createTeacherSyllabusApi : createSyllabusApi;
      await createSyllabus({
        academic_year: formData.academic_year,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        status: Number(formData.status),
        lession: formData.lession.trim(),
      });
      toast.success('Syllabus added successfully!');
      navigate(`${basePath}/academics/syllabus`);
    } catch (err) {
      toast.error(err.message || 'Failed to add syllabus.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Add Syllabus</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/syllabus`}>Syllabus</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Add Syllabus
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light">
                <h4 className="text-dark mb-0 fw-bold">Syllabus Details</h4>
              </div>
              <div className="card-body pb-1">
                <div className="row row-cols-md-6">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        value={formData.academic_year}
                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                        required
                      >
                        <option value="">Select Academic Year</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {formatAcademicYear(ay)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        value={formData.class_id}
                        onChange={(e) => {
                          setFormData({ ...formData, class_id: e.target.value, subject_id: '' });
                        }}
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        value={formData.subject_id}
                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                        required
                      >
                        <option value="">Select Subject</option>
                        {filteredSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        required
                      >
                        <option value="1">Pending</option>
                        <option value="2">Progress</option>
                        <option value="3">Complete</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row row-cols-md-6 syllabus-row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Lession <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="4"
                        placeholder="e.g. Unit 1 : A Happy Child"
                        value={formData.lession}
                        onChange={(e) => setFormData({ ...formData, lession: e.target.value })}
                        required
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-3">
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/academics/syllabus`)}
                    className="btn btn-light me-3"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSyllabus;
