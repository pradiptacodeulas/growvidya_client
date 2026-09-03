import { getServerBaseUrl } from '../../../utils/url.util';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchCertificateTemplateByIdApi,
  createCertificateTemplateApi,
  updateCertificateTemplateApi,
  fetchCertificateCategoriesApi,
  fetchCertificateBordersApi,
} from '../../../api/adminCertificate.api';
import { decodeParam } from '../../../utils/idHelper';

const ENTITIES_LIST = [
  { label: 'Name', key: 'name' },
  { label: 'Date of Birth', key: 'date_of_birth' },
  { label: 'Guardian Name', key: 'guardian_name' },
  { label: 'City', key: 'city' },
  { label: 'State', key: 'state' },
  { label: 'Country', key: 'country' },
  { label: 'Admission Date', key: 'admission_date' },
  { label: 'Leaving Date', key: 'leaving_date' },
  { label: 'Class', key: 'class' },
  { label: 'Academic Year', key: 'academic_year' },
  { label: 'Admission No', key: 'admission_no' },
  { label: 'Date', key: 'date' },
  { label: 'Place', key: 'place' },
];

const getBorderUrl = (borderPath) => {
  if (!borderPath) return '';
  if (borderPath.startsWith('http://') || borderPath.startsWith('https://')) return borderPath;
  const cleanPath = borderPath.startsWith('/') ? borderPath.slice(1) : borderPath;
  return `${getServerBaseUrl()}/${cleanPath}`;
};

const EditCertificateTemplate = () => {
  const { id: rawId } = useParams();
  const parsedId = decodeParam(rawId);
  const id = parsedId;
  const navigate = useNavigate();
  const descriptionRef = useRef(null);

  const isEdit = Boolean(parsedId);

  const [categories, setCategories] = useState([]);
  const [borders, setBorders] = useState([]);
  const [formData, setFormData] = useState({
    certificate_category: '',
    template_name: '',
    status: '1',
    certificate_heading: '',
    certified_by: '',
    short_description: '',
    description: '',
    border: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const loadBorders = useCallback(async () => {
    try {
      const bRes = await fetchCertificateBordersApi().catch(() => ({ data: [] }));
      const bList = Array.isArray(bRes?.data) ? bRes.data : Array.isArray(bRes) ? bRes : [];
      const activeBorders = bList.filter((b) => b.status === 1 || String(b.status) === '1');
      setBorders(activeBorders);
      return activeBorders;
    } catch (err) {
      console.error('Failed to load borders:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const [catRes, bList] = await Promise.all([
          fetchCertificateCategoriesApi().catch(() => null),
          loadBorders(),
        ]);
        const catList = catRes?.data || catRes || [];
        const activeCats = Array.isArray(catList)
          ? catList.filter((c) => c.status === 1 || String(c.status) === '1')
          : [];
        setCategories(activeCats);

        if (isEdit) {
          setLoading(true);
          const res = await fetchCertificateTemplateByIdApi(parsedId);
          const data = res?.data || res;
          if (data) {
            setFormData({
              certificate_category: data.certificate_category
                ? String(data.certificate_category)
                : (activeCats.length > 0 ? String(activeCats[0].id) : ''),
              template_name: data.template_name || '',
              status: data.status !== undefined && data.status !== null ? String(data.status) : '1',
              certificate_heading: data.certificate_heading || '',
              certified_by: data.certified_by || '',
              short_description: data.short_description || '',
              description: data.description || '',
              border: data.border ? String(data.border) : (bList.length > 0 ? String(bList[0].id) : ''),
            });
          }
        } else {
          setFormData((prev) => ({
            ...prev,
            certificate_category: prev.certificate_category || (activeCats.length > 0 ? String(activeCats[0].id) : ''),
            border: prev.border || (bList.length > 0 ? String(bList[0].id) : ''),
            status: '1',
          }));
        }
      } catch (err) {
        console.error('Failed to load template data:', err);
        toast.error('Failed to load template details.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [isEdit, parsedId, loadBorders]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Insert Entity tag at cursor position inside description textarea
  const handleInsertEntity = (key) => {
    const tag = `{{${key}}}`;
    const textarea = descriptionRef.current;
    if (!textarea) {
      setFormData((prev) => ({
        ...prev,
        description: prev.description ? `${prev.description} ${tag}` : tag,
      }));
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentVal = formData.description || '';
    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);

    setFormData((prev) => ({
      ...prev,
      description: newVal,
    }));

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.certificate_category) {
      toast.error('Certificate Category is required.');
      return;
    }
    if (!formData.template_name.trim()) {
      toast.error('Template Name is required.');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        certificate_category: Number(formData.certificate_category),
        template_name: formData.template_name.trim(),
        certificate_heading: formData.certificate_heading.trim(),
        certified_by: formData.certified_by.trim() || 'Principal',
        short_description: formData.short_description || '',
        description: formData.description.trim(),
        border: String(formData.border || '1'),
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateCertificateTemplateApi(parsedId, payload);
        toast.success('Template updated successfully.');
      } else {
        await createCertificateTemplateApi(payload);
        toast.success('Template created successfully.');
      }
      navigate('/admin/certificates/template');
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Template' : 'Add Template'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/certificates/template">Template</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Template' : 'Add Template'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-8">
          <form onSubmit={handleSubmit}>
            {/* Template Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">Template</h4>
                </div>
              </div>

              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading template details...
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Certificate Category <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="certificate_category"
                          id="certificate_category"
                          value={formData.certificate_category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.category_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Template Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="template_name"
                          id="template_name"
                          placeholder="Template Name"
                          value={formData.template_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

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
                          <option value="1">Active</option>
                          <option value="2">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Certificate Heading</label>
                        <input
                          type="text"
                          className="form-control"
                          name="certificate_heading"
                          id="certificate_heading"
                          value={formData.certificate_heading}
                          onChange={handleChange}
                          placeholder="Certificate Heading"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Certified by</label>
                        <input
                          type="text"
                          className="form-control"
                          name="certified_by"
                          id="certified_by"
                          value={formData.certified_by}
                          onChange={handleChange}
                          placeholder="Certified by"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Short Description</label>
                        <textarea
                          className="form-control"
                          name="short_description"
                          id="short_description"
                          rows="2"
                          value={formData.short_description}
                          onChange={handleChange}
                        ></textarea>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          ref={descriptionRef}
                          className="form-control"
                          name="description"
                          id="description"
                          rows="5"
                          value={formData.description}
                          onChange={handleChange}
                          required
                        ></textarea>
                      </div>
                    </div>

                    {/* Choose Template Border */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <label className="form-label mb-0 fw-semibold text-dark">
                            Choose Border Template <strong className="text-danger">*</strong>
                          </label>
                          <Link
                            to="/admin/certificates/border"
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="ti ti-external-link me-1"></i>
                            Manage Borders
                          </Link>
                        </div>

                        {borders.length === 0 ? (
                          <div className="alert alert-warning d-flex align-items-center justify-content-between p-3 mb-0 rounded">
                            <div className="d-flex align-items-center">
                              <i className="ti ti-alert-circle fs-20 me-2 text-warning"></i>
                              <span>
                                No border templates available. Please upload borders on the{' '}
                                <Link to="/admin/certificates/border" className="fw-bold text-dark text-decoration-underline">
                                  Certificate Border
                                </Link>{' '}
                                page.
                              </span>
                            </div>
                            <Link to="/admin/certificates/border" className="btn btn-sm btn-warning ms-3 text-nowrap">
                              Go to Borders
                            </Link>
                          </div>
                        ) : (
                          <div className="row g-3">
                            {borders.map((borderItem, idx) => {
                              const isSelected = String(formData.border) === String(borderItem.id);
                              const borderUrl = getBorderUrl(borderItem.image);
                              return (
                                <div
                                  key={borderItem.id}
                                  className="col-6 col-md-3 text-center cursor-pointer position-relative"
                                  onClick={() =>
                                    setFormData((prev) => ({ ...prev, border: String(borderItem.id) }))
                                  }
                                >
                                  <div
                                    className={`p-1 rounded position-relative ${
                                      isSelected
                                        ? 'border border-2 border-primary shadow-sm'
                                        : 'border border-2 border-light'
                                    }`}
                                    style={{
                                      background: '#fcfcfc',
                                      borderColor: isSelected ? '#2e7d32' : undefined,
                                      boxShadow: isSelected ? '0 0 0 3px rgba(46,125,50,0.2)' : undefined,
                                    }}
                                  >
                                    <img
                                      src={borderUrl}
                                      className="img-fluid rounded"
                                      alt={`Border ${idx + 1}`}
                                      style={{
                                        width: '100%',
                                        height: '180px',
                                        objectFit: 'contain',
                                        aspectRatio: '210 / 297',
                                      }}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/210x297?text=A4+Portrait+Border';
                                      }}
                                    />
                                  </div>
                                  <div className="form-check d-flex justify-content-center mt-1">
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      name="border"
                                      id={`border_${borderItem.id}`}
                                      value={borderItem.id}
                                      checked={isSelected}
                                      onChange={() =>
                                        setFormData((prev) => ({ ...prev, border: String(borderItem.id) }))
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-end mb-2 pe-3 pb-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/certificates/template')}
                  className="btn btn-light me-3"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Entities Sidebar */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-light">
              <div className="d-flex align-items-center">
                <h4 className="text-dark">Entities</h4>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="d-flex flex-wrap gap-2">
                {ENTITIES_LIST.map((entity) => (
                  <button
                    key={entity.key}
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-2 px-3 py-1"
                    onClick={() => handleInsertEntity(entity.key)}
                    title={`Insert {{${entity.key}}}`}
                  >
                    {entity.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCertificateTemplate;

