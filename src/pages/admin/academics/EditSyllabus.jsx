import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSyllabusByIdApi,
  updateSyllabusApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherSyllabusByIdApi,
  updateTeacherSyllabusApi,
} from '../../../api/teacherAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const EditSyllabus = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();

  const [syllabus, setSyllabus] = useState(null);
  const [status, setStatus] = useState('1');
  const [lession, setLession] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadSyllabusData();
    }
  }, [id]);

  const loadSyllabusData = async () => {
    try {
      setLoading(true);
      const fetchSyllabusById = isTeacher ? fetchTeacherSyllabusByIdApi : fetchSyllabusByIdApi;
      const res = await fetchSyllabusById(id);
      const data = res?.data || res;
      if (!data) {
        toast.error('Syllabus item not found.');
        return navigate(`${basePath}/academics/syllabus`);
      }
      setSyllabus(data);
      setStatus(String(data.status || '1'));
      setLession(data.lession || '');
    } catch (err) {
      toast.error('Failed to load syllabus details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lession.trim()) {
      return toast.warning('Please enter the lesson content.');
    }
    try {
      setSubmitting(true);
      const updateSyllabus = isTeacher ? updateTeacherSyllabusApi : updateSyllabusApi;
      await updateSyllabus(id, {
        academic_year: syllabus.academic_year,
        class_id: syllabus.class_id,
        subject_id: syllabus.subject_id,
        lession: lession.trim(),
        status: Number(status),
      });
      toast.success('Syllabus updated successfully!');
      navigate(`${basePath}/academics/syllabus`);
    } catch (err) {
      toast.error(err.message || 'Failed to update syllabus.');
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
          <h3 className="mb-1">Edit Syllabus</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/syllabus`}>Syllabus</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Edit Syllabus
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Syllabus Information */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fw-bold">Syllabus</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                <div className="row row-cols-md-6">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <span className="form-control bg-light text-dark fw-medium">
                        {syllabus?.academic_year_name || `Academic Year ${syllabus?.academic_year || ''}`}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Class <span className="text-danger">*</span>
                      </label>
                      <span className="form-control bg-light text-dark fw-medium">
                        {syllabus?.class_name || syllabus?.class_id || ''}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <span className="form-control bg-light text-dark fw-medium">
                        {syllabus?.subject_name || syllabus?.subject_id || ''}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="status"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
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
                        name="lession"
                        id="lession"
                        rows="4"
                        value={lession}
                        onChange={(e) => setLession(e.target.value)}
                        placeholder="Enter lesson unit or topic..."
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
                        Updating...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </div>
            {/* /Syllabus Information */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSyllabus;
