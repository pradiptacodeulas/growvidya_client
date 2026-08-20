import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSectionByIdApi,
  fetchSectionsApi,
  fetchClassesApi,
  createSectionApi,
  updateSectionApi,
} from '../../../api/adminAcademic.api';

// Helper to resolve base64 or normal numeric ID
const resolveSectionId = (paramId) => {
  if (!paramId) return null;
  try {
    const unescaped = decodeURIComponent(paramId);
    const decoded = atob(unescaped);
    if (!isNaN(Number(decoded)) && Number(decoded) > 0) {
      return decoded;
    }
  } catch (e) {
    // Not base64 encoded, return as is
  }
  return paramId;
};

const EditSection = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = resolveSectionId(rawId);
  const isEdit = Boolean(id);

  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    section_name: '',
    capacity: '100',
    note: '',
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
      const clsRes = await fetchClassesApi().catch(() => ({ data: [] }));
      const clsList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
      setClasses(clsList);

      if (isEdit) {
        let secData = null;
        try {
          const res = await fetchSectionByIdApi(id);
          secData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all sections and find matching id
          const allRes = await fetchSectionsApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          secData = list.find((s) => String(s.id) === String(id));
        }

        if (secData) {
          setFormData({
            class_id: secData.class_id ? String(secData.class_id) : (clsList[0]?.id ? String(clsList[0].id) : ''),
            section_name: secData.section_name || '',
            capacity: secData.capacity !== undefined && secData.capacity !== null ? String(secData.capacity) : '100',
            note: secData.note || '',
            sort_order: secData.sort_order !== undefined && secData.sort_order !== null ? String(secData.sort_order) : '1',
            status: secData.status === 2 || secData.status === 0 ? '2' : '1',
          });
        } else {
          toast.error('Section record not found.');
        }
      } else {
        if (clsList.length > 0) {
          setFormData((prev) => ({
            ...prev,
            class_id: String(clsList[0].id),
          }));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load section details.');
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
    if (!formData.section_name.trim()) {
      return toast.warning('Please enter Section Name.');
    }

    try {
      setSaving(true);
      const payload = {
        class_id: Number(formData.class_id),
        section_name: formData.section_name.trim(),
        capacity: Number(formData.capacity) || 0,
        note: formData.note.trim(),
        sort_order: Number(formData.sort_order) || 1,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateSectionApi(id, payload);
        toast.success('Section updated successfully!');
      } else {
        await createSectionApi(payload);
        toast.success('Section created successfully!');
      }
      navigate('/admin/academics/sections');
    } catch (err) {
      toast.error(err.message || 'Failed to save section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Section' : 'Add Section'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/sections">Sections</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Section' : 'Add Section'}
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
                    <h4 className="text-dark mb-0">Section</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Class <span className="text-danger">*</span>
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
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.class_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Section Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="section_name"
                          id="section_name"
                          value={formData.section_name}
                          onChange={handleChange}
                          placeholder="e.g. A, B, C"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Capacity <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="capacity"
                          id="capacity"
                          value={formData.capacity}
                          onChange={handleChange}
                          placeholder="100"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Note <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="note"
                          id="note"
                          value={formData.note}
                          onChange={handleChange}
                          placeholder="Note"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Sort Order <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="sort_order"
                          id="sort_order"
                          value={formData.sort_order}
                          onChange={handleChange}
                          placeholder="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
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

                  <div className="text-end mb-2 p-3 border-top">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/academics/sections')}
                      className="btn btn-light me-3"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="submitBtn"
                      className="btn btn-primary"
                      disabled={saving}
                    >
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
              </div>
              {/* /Personal Information */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditSection;
