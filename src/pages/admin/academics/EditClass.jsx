import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchClassByIdApi, createClassApi, updateClassApi, fetchShiftsApi } from '../../../api/adminAcademic.api';

const EditClass = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [shifts, setShifts] = useState([]);
  const [formData, setFormData] = useState({
    shift_id: '',
    class_name: '',
    sort_order: '1',
    status: '1',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadShifts();
    if (isEdit) {
      fetchClassDetails();
    }
  }, [id]);

  const loadShifts = async () => {
    try {
      const res = await fetchShiftsApi();
      const shiftsList = Array.isArray(res?.data) ? res.data : [];
      setShifts(shiftsList);
      if (!isEdit && shiftsList.length > 0 && !formData.shift_id) {
        const firstActive = shiftsList.find((s) => Number(s.status) === 1);
        if (firstActive) {
          setFormData((prev) => ({ ...prev, shift_id: String(firstActive.id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load shifts', err);
    }
  };

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const res = await fetchClassByIdApi(id);
      const data = res?.data || res;
      if (data) {
        setFormData({
          shift_id: data.shift_id ? String(data.shift_id) : '',
          class_name: data.class_name || '',
          sort_order: data.sort_order !== undefined && data.sort_order !== null ? String(data.sort_order) : '1',
          status: data.status === 2 || data.status === 0 ? '2' : '1',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load class details.');
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
    if (!formData.class_name.trim()) {
      return toast.warning('Please enter Class Name.');
    }
    if (!formData.shift_id) {
      return toast.warning('Please select a Shift.');
    }

    try {
      setSaving(true);
      const payload = {
        shift_id: Number(formData.shift_id),
        class_name: formData.class_name.trim(),
        sort_order: Number(formData.sort_order) || 0,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateClassApi(id, payload);
        toast.success('Class updated successfully!');
      } else {
        await createClassApi(payload);
        toast.success('Class added successfully!');
      }
      navigate('/admin/academics/classes');
    } catch (err) {
      toast.error(err.message || 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Class' : 'Add Class'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/classes">Class</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Class' : 'Add Class'}
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
              <div className="spinner-border text-primary mx-auto" role="status"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Class Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Class</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Shift <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="shift_id"
                          id="shift_id"
                          value={formData.shift_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Shift</option>
                          {shifts
                            .filter((s) => Number(s.status) === 1)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.shift_name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Class Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="class_name"
                          id="class_name"
                          value={formData.class_name}
                          onChange={handleChange}
                          placeholder="e.g. I, II, Class 1"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
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
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
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

                <div className="card-footer text-end mb-2">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/classes')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
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
              {/* /Class Information */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditClass;
