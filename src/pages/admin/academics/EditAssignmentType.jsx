import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchAssignmentTypeByIdApi,
  updateAssignmentTypeApi,
} from '../../../api/adminAcademic.api';

const resolveId = (paramId) => {
  if (!paramId) return null;
  try {
    const unescaped = decodeURIComponent(paramId);
    const decoded = atob(unescaped);
    if (!isNaN(Number(decoded)) && Number(decoded) > 0) {
      return decoded;
    }
  } catch (e) {
    // Not base64
  }
  return paramId;
};

const EditAssignmentType = () => {
  const { id: rawId } = useParams();
  const id = resolveId(rawId);
  const navigate = useNavigate();

  const [typeName, setTypeName] = useState('');
  const [status, setStatus] = useState('1');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchAssignmentTypeByIdApi(id);
      const data = res?.data || res;
      if (!data) {
        toast.error('Assignment type not found.');
        return navigate('/admin/academics/assignment-types');
      }
      setTypeName(data.type_name || '');
      setStatus(String(data.status || '1'));
    } catch (err) {
      toast.error('Failed to load assignment type details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      return toast.warning('Please enter the assignment type name.');
    }
    try {
      setSubmitting(true);
      await updateAssignmentTypeApi(id, {
        type_name: typeName.trim(),
        status: Number(status),
      });
      toast.success('Assignment type updated successfully!');
      navigate('/admin/academics/assignment-types');
    } catch (err) {
      toast.error(err.message || 'Failed to update assignment type.');
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
          <h3 className="mb-1">Edit Assignment Types</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/assignment-types">Assignment Types</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Edit Assignment Types
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
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fw-bold">Assignment Types</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                <div className="row row-cols-md-6">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Type <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="type_name"
                        id="type_name"
                        value={typeName}
                        onChange={(e) => setTypeName(e.target.value)}
                        placeholder="e.g. Homework, Classwork"
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
                        className="form-select select"
                        name="status"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        required
                      >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-end mb-3 pe-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/academics/assignment-types')}
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAssignmentType;
