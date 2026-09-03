import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import { decodeParam } from '../../../utils/idHelper';

const AddExam = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    exam_name: '',
    status: 1,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchExamDetails();
    }
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const res = await adminExaminationApi.getExamById(id);
      if (res?.data?.exam) {
        const ex = res.data.exam;
        setFormData({
          exam_name: ex.exam_name || '',
          status: ex.status !== undefined ? ex.status : 1,
        });
      } else {
        toast.error('Exam not found.');
        navigate('/admin/examinations/exams');
      }
    } catch (err) {
      console.error('Error fetching exam details:', err);
      toast.error(err.message || 'Failed to fetch exam details.');
      navigate('/admin/examinations/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'status' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.exam_name.trim()) {
      toast.warning('Please enter Exam Name.');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await adminExaminationApi.updateExam(id, formData);
        toast.success(`Exam "${formData.exam_name}" updated successfully!`);
      } else {
        await adminExaminationApi.createExam(formData);
        toast.success(`Exam "${formData.exam_name}" created successfully!`);
      }
      navigate('/admin/examinations/exams');
    } catch (err) {
      console.error('Error saving exam:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save exam.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Exam' : 'Add Exam'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/examinations/exams">Exam</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Exam' : 'Add Exam'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card p-5 text-center">
              <div className="spinner-border text-primary mx-auto" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading exam details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Exam Card */}
              <div className="card shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Exam</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Exam <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="exam_name"
                          id="exam"
                          value={formData.exam_name}
                          onChange={handleChange}
                          placeholder="e.g. Term-1, Half-Yearly Exam"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                        >
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 pe-3 pb-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/examinations/exams')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
              {/* /Exam Card */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExam;
