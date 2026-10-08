import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchDayByIdApi, fetchDaysApi, updateDayApi, createDayApi } from '../../../api/adminAcademic.api';
import { fetchBranchesApi } from '../../../api/branch.api';
import { decodeParam } from '../../../utils/idHelper';

const EditDays = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    day_name: '',
    branch_id: '',
    status: '1',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranches();
    if (isEdit) {
      fetchDayDetails();
    }
  }, [rawId]);

  const loadBranches = async () => {
    try {
      const res = await fetchBranchesApi({ status: 1 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBranches(list);

      // Pre-select active branch or default main branch in Add mode
      if (!isEdit) {
        const activeBranchId = localStorage.getItem('active_branch_id');
        if (activeBranchId && activeBranchId !== 'all') {
          setFormData((prev) => ({
            ...prev,
            branch_id: prev.branch_id || String(activeBranchId),
          }));
        } else if (list.length > 0) {
          const mainBranch = list.find((b) => b.is_main_branch === 1) || list[0];
          if (mainBranch) {
            setFormData((prev) => ({
              ...prev,
              branch_id: prev.branch_id || String(mainBranch.id),
            }));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  const fetchDayDetails = async () => {
    try {
      setLoading(true);
      let dayData = null;
      try {
        const res = await fetchDayByIdApi(id);
        dayData = res?.data || res;
      } catch (e) {
        // Fallback to fetch all days and find matching id
        const allRes = await fetchDaysApi();
        const daysList = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
        dayData = daysList.find((d) => String(d.id) === String(id));
      }

      if (dayData) {
        setFormData({
          day_name: dayData.day_name || '',
          branch_id: dayData.branch_id ? String(dayData.branch_id) : '',
          status: dayData.status === 2 || dayData.status === 0 ? '2' : '1',
        });
      } else {
        toast.error('Day record not found.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load day details.');
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
    if (!formData.day_name.trim()) {
      return toast.warning('Please enter Day Name.');
    }

    try {
      setSaving(true);
      const activeBranchId = localStorage.getItem('active_branch_id');
      const resolvedBranchId = formData.branch_id
        ? Number(formData.branch_id)
        : (activeBranchId && activeBranchId !== 'all' ? Number(activeBranchId) : null);

      const payload = {
        day_name: formData.day_name.trim(),
        branch_id: resolvedBranchId,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateDayApi(id, payload);
        toast.success('Day updated successfully!');
      } else {
        await createDayApi(payload);
        toast.success('Day created successfully!');
      }
      navigate('/admin/academics/days');
    } catch (err) {
      toast.error(err.message || 'Failed to save day.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Days' : 'Add Days'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/days">Days</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Days' : 'Add Days'}
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
              {/* Day Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Days</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row">
                    {/* Campus / Branch */}
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Campus / Branch
                        </label>
                        <select
                          className="form-select"
                          name="branch_id"
                          id="branch_id"
                          value={formData.branch_id}
                          onChange={handleChange}
                        >
                          <option value="">Default / Main Campus</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.branch_name} {b.is_main_branch ? '(Main Campus)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Day Name */}
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Day Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="day_name"
                          id="day_name"
                          value={formData.day_name}
                          onChange={handleChange}
                          placeholder="e.g. Monday"
                          required
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                        >
                          <option value="1">Working Day (Active)</option>
                          <option value="2">Weekend / Holiday (Inactive)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end mb-2 p-3 border-top">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/academics/days')}
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
              {/* /Day Information */}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditDays;
