import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import { fetchBranchesApi } from '../../../api/branch.api';
import { decodeParam } from '../../../utils/idHelper';

const AddGradeSetting = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    grade_name: '',
    min_percentage: '',
    max_percentage: '',
    status: 1,
    branch_id: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranches();
    if (isEdit) {
      fetchGradeDetails();
    }
  }, [id]);

  const loadBranches = async () => {
    try {
      const res = await fetchBranchesApi({ status: 1 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBranches(list);

      if (!isEdit) {
        const activeBranchId = localStorage.getItem('active_branch_id');
        if (activeBranchId && activeBranchId !== 'all') {
          setFormData((prev) => ({
            ...prev,
            branch_id: prev.branch_id || String(activeBranchId),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  };

  const fetchGradeDetails = async () => {
    try {
      setLoading(true);
      const res = await adminExaminationApi.getGradeById(id);
      if (res?.data?.grade) {
        const g = res.data.grade;
        setFormData({
          grade_name: g.grade_name || '',
          min_percentage: g.min_percentage !== undefined ? g.min_percentage : '',
          max_percentage: g.max_percentage !== undefined ? g.max_percentage : '',
          status: g.status !== undefined ? g.status : 1,
          branch_id: g.branch_id ? String(g.branch_id) : '',
        });
      } else {
        toast.error('Grade setting not found.');
        navigate('/admin/examinations/grades');
      }
    } catch (err) {
      console.error('Error fetching grade details:', err);
      toast.error(err.message || 'Failed to fetch grade details.');
      navigate('/admin/examinations/grades');
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

    if (!formData.grade_name.trim()) {
      toast.warning('Please enter Grade Name.');
      return;
    }
    if (formData.min_percentage === '' || formData.max_percentage === '') {
      toast.warning('Please enter Minimum and Maximum percentages.');
      return;
    }

    const min = parseInt(formData.min_percentage, 10);
    const max = parseInt(formData.max_percentage, 10);

    if (min < 0 || max > 100 || min > max) {
      toast.warning('Please enter valid percentage values (0 - 100 with Min <= Max).');
      return;
    }

    const activeBranchId = localStorage.getItem('active_branch_id');
    const branchVal = formData.branch_id || (activeBranchId && activeBranchId !== 'all' ? activeBranchId : null);
    const payload = {
      ...formData,
      branch_id: branchVal ? Number(branchVal) : null,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await adminExaminationApi.updateGrade(id, payload);
        toast.success(`Grade "${formData.grade_name}" updated successfully!`);
      } else {
        await adminExaminationApi.createGrade(payload);
        toast.success(`Grade "${formData.grade_name}" created successfully!`);
      }
      navigate('/admin/examinations/grades');
    } catch (err) {
      console.error('Error saving grade setting:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save grade setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Grade' : 'Add Grade'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/examinations/grades">Grade</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Grade' : 'Add Grade'}
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
              <p className="mt-2 text-muted">Loading grade details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Personal Information / Grade Card */}
              <div className="card shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Grade</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Grade <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="grade_name"
                          id="grade_name"
                          value={formData.grade_name}
                          onChange={handleChange}
                          placeholder="e.g. A+, A, B"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Campus / Branch
                        </label>
                        <select
                          className="form-select"
                          name="branch_id"
                          id="branch_id"
                          value={formData.branch_id}
                          onChange={handleChange}
                        >
                          <option value="">All Campuses (School-wide)</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.branch_name} {b.is_main_branch === 1 ? '(Main Campus)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
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
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Minimum Percentage <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control"
                          name="min_percentage"
                          id="min_percentage"
                          value={formData.min_percentage}
                          onChange={handleChange}
                          placeholder="Minimum Percentage"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Maximum Percentage <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control"
                          name="max_percentage"
                          id="max_percentage"
                          value={formData.max_percentage}
                          onChange={handleChange}
                          placeholder="Maximum Percentage"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 pe-3 pb-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/examinations/grades')}
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
              {/* /Grade Card */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddGradeSetting;
