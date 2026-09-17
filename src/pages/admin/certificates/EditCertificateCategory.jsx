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
    sort_order: '0',
    status: '1',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
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
              sort_order: data.sort_order !== undefined && data.sort_order !== null ? String(data.sort_order) : '0',
              status: data.status !== undefined && data.status !== null ? String(data.status) : '1',
            });
          }
        } catch (err) {
          console.error('Failed to load category details:', err);
          toast.error(err.response?.data?.message || 'Failed to load category details.');
        } finally {
          setLoading(false);
        }
      };
      loadDetails();
    }
  }, [isEdit, parsedId]);

  // Client validation rules
  const validateField = (name, value) => {
    let error = '';
    const strVal = String(value ?? '').trim();

    if (name === 'category_name') {
      if (!strVal) {
        error = 'Category Name is required.';
      } else if (strVal.length < 2) {
        error = 'Category Name must be at least 2 characters.';
      } else if (strVal.length > 100) {
        error = 'Category Name cannot exceed 100 characters.';
      } else if (!/[a-zA-Z]/.test(strVal)) {
        error = 'Category Name must contain at least one alphabet letter.';
      }
    } else if (name === 'sort_order') {
      if (strVal !== '') {
        const num = Number(strVal);
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
          error = 'Sort Order must be a valid whole number (0 or higher).';
        } else if (num > 99999) {
          error = 'Sort Order cannot exceed 99,999.';
        }
      }
    } else if (name === 'status') {
      if (!['1', '2'].includes(String(value))) {
        error = 'Status must be either Active or Inactive.';
      }
    }

    return error;
  };

  const validateAll = (data) => {
    const newErrors = {};
    const nameErr = validateField('category_name', data.category_name);
    if (nameErr) newErrors.category_name = nameErr;

    const sortErr = validateField('sort_order', data.sort_order);
    if (sortErr) newErrors.sort_order = sortErr;

    const statusErr = validateField('status', data.status);
    if (statusErr) newErrors.status = statusErr;

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: err,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    const err = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: err,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateAll(formData);
    setTouched({
      category_name: true,
      sort_order: true,
      status: true,
    });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(firstKey);
      if (el) el.focus();
      toast.error(validationErrors[firstKey] || 'Please fix the errors in the form.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        category_name: formData.category_name.trim(),
        sort_order: formData.sort_order !== '' ? Number(formData.sort_order) : 0,
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateCertificateCategoryApi(parsedId, payload);
        toast.success('Certificate category updated successfully.');
      } else {
        await createCertificateCategoryApi(payload);
        toast.success('Certificate category created successfully.');
      }
      navigate('/admin/certificates/category');
    } catch (err) {
      console.error('Error saving category:', err);
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setErrors((prev) => ({
          ...prev,
          ...serverErrors,
        }));
      }
      const message =
        err.response?.data?.message ||
        (serverErrors && typeof serverErrors === 'object'
          ? Object.values(serverErrors)[0]
          : 'Failed to save certificate category.');
      toast.error(message);
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
                {isEdit ? ' Edit Category' : ' Add Category'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit} noValidate>
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
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading category details...</span>
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
                          className={`form-control ${touched.category_name && errors.category_name ? 'is-invalid' : touched.category_name && !errors.category_name ? 'is-valid' : ''}`}
                          name="category_name"
                          id="category_name"
                          placeholder="Category Name"
                          value={formData.category_name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                        />
                        {touched.category_name && errors.category_name && (
                          <div className="invalid-feedback d-block">{errors.category_name}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Sort Order</label>
                        <input
                          type="number"
                          className={`form-control ${touched.sort_order && errors.sort_order ? 'is-invalid' : ''}`}
                          name="sort_order"
                          id="sort_order"
                          placeholder="Sort Order"
                          value={formData.sort_order}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        {touched.sort_order && errors.sort_order && (
                          <div className="invalid-feedback d-block">{errors.sort_order}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className={`form-select select ${touched.status && errors.status ? 'is-invalid' : ''}`}
                          name="status"
                          id="status"
                          value={formData.status}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                        {touched.status && errors.status && (
                          <div className="invalid-feedback d-block">{errors.status}</div>
                        )}
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
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
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
