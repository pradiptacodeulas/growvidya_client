import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSubjectByIdApi,
  fetchSubjectsApi,
  createSubjectApi,
  updateSubjectApi,
  fetchClassesApi,
} from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const EditSubject = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_name: '',
    sort_order: '1',
    status: '1',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [rawId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load active classes
      let classList = [];
      try {
        const clsRes = await fetchClassesApi();
        classList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
        setClasses(classList);
      } catch (err) {
        console.error('Failed to load classes', err);
      }

      if (isEdit) {
        let subjectData = null;
        try {
          const res = await fetchSubjectByIdApi(id);
          subjectData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all subjects and find matching id
          const allRes = await fetchSubjectsApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          subjectData = list.find((s) => String(s.id) === String(id));
        }

        if (subjectData) {
          setFormData({
            class_id: subjectData.class_id ? String(subjectData.class_id) : '',
            subject_name: subjectData.subject_name || '',
            sort_order: subjectData.sort_order !== undefined && subjectData.sort_order !== null ? String(subjectData.sort_order) : '1',
            status: subjectData.status === 2 || subjectData.status === 0 ? '2' : '1',
          });
        } else {
          toast.error('Subject record not found.');
        }
      } else if (classList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          class_id: prev.class_id || String(classList[0].id),
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load subject details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id) {
      return toast.warning('Please select a Class.');
    }
    if (!formData.subject_name.trim()) {
      return toast.warning('Please enter Subject Name.');
    }

    try {
      setSaving(true);
      const payload = {
        class_id: formData.class_id,
        subject_name: formData.subject_name.trim(),
        sort_order: Number(formData.sort_order) || 0,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateSubjectApi(id, payload);
        toast.success('Subject updated successfully!');
      } else {
        await createSubjectApi(payload);
        toast.success('Subject created successfully!');
      }
      navigate('/admin/academics/subjects');
    } catch (err) {
      toast.error(err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Subject' : 'Add Subject'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/subjects">Subject</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Subject' : 'Add Subject'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card p-5 text-center shadow-sm">
              <div className="spinner-border text-primary mx-auto" role="status"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Subject</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Class Name <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="class_id"
                          id="class_id"
                          value={formData.class_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.class_name || `Class ${cls.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Subject Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="subject_name"
                          id="subject_name"
                          value={formData.subject_name}
                          onChange={handleChange}
                          placeholder="e.g. Bengali, English, Math"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Sort Order <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          name="sort_order"
                          id="sort_order"
                          value={formData.sort_order}
                          onChange={handleChange}
                          placeholder="e.g. 1"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                          required
                        >
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 p-3 border-top">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/subjects')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Saving...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
              {/* /Personal Information */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditSubject;
