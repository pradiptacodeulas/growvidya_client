import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateCategoryByIdApi,
  createCertificateCategoryApi,
  updateCertificateCategoryApi,
} from '../../../api/adminCertificate.api';
import { decodeParam } from '../../../utils/idHelper';

const EditCertificateCategory = () => {
  const { id: rawId } = useParams();
  const parsedId = decodeParam(rawId);
  const id = parsedId;
  const navigate = useNavigate();

  const isEdit = Boolean(parsedId);

  const [formData, setFormData] = useState({
    category_name: '',
    sort_order: '1',
    status: '1',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const loadDetails = async () => {
        try {
          setLoading(true);
          const res = await fetchCertificateCategoryByIdApi(parsedId);
          const data = res?.data || res;
          if (data) {
            setFormData({
              category_name: data.category_name || '',
              sort_order: data.sort_order !== undefined && data.sort_order !== null ? String(data.sort_order) : '1',
              status: data.status !== undefined && data.status !== null ? String(data.status) : '1',
            });
          }
        } catch (err) {
          console.error('Failed to load category details:', err);
          toast.error('Failed to load category details.');
        } finally {
          setLoading(false);
        }
      };
      loadDetails();
    }
  }, [isEdit, parsedId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_name.trim()) {
      toast.error('Category Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        category_name: formData.category_name.trim(),
        sort_order: Number(formData.sort_order) || 0,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateCertificateCategoryApi(parsedId, payload);
        toast.success('Category updated successfully.');
      } else {
        await createCertificateCategoryApi(payload);
        toast.success('Category created successfully.');
      }
      navigate('/admin/certificates/category');
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Category' : 'Add Category'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/certificates/category">Category</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Category' : 'Add Category'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Category Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">Category</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading category details...
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Category Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="category_name"
                          id="category_name"
                          placeholder="Category Name"
                          value={formData.category_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Sort Order</label>
                        <input
                          type="number"
                          className="form-control"
                          name="sort_order"
                          id="sort_order"
                          placeholder="Sort Order"
                          value={formData.sort_order}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
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
                )}
              </div>

              <div className="text-end mb-2 pe-3 pb-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/certificates/category')}
                  className="btn btn-light me-3"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* /Category Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditCertificateCategory;
