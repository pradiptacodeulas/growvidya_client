import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchDocumentTypeByIdApi,
  fetchDocumentTypesApi,
  createDocumentTypeApi,
  updateDocumentTypeApi,
} from '../../../api/adminAcademic.api';
import { decodeParam } from '../../../utils/idHelper';

const EditDocumentType = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    document_type_name: '',
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
      if (isEdit) {
        let docData = null;
        try {
          const res = await fetchDocumentTypeByIdApi(id);
          docData = res?.data || res;
        } catch (e) {
          // Fallback to fetch all document types and find matching id
          const allRes = await fetchDocumentTypesApi();
          const list = Array.isArray(allRes?.data) ? allRes.data : Array.isArray(allRes) ? allRes : [];
          docData = list.find((d) => String(d.id) === String(id));
        }

        if (docData) {
          setFormData({
            document_type_name: docData.document_type_name || '',
            status: docData.status === 2 || docData.status === 0 ? '2' : '1',
          });
        } else {
          toast.error('Document type record not found.');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load document type details.');
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
    if (!formData.document_type_name.trim()) {
      return toast.warning('Please enter Document Type Name.');
    }

    try {
      setSaving(true);
      const payload = {
        document_type_name: formData.document_type_name.trim(),
        status: Number(formData.status),
      };

      if (isEdit) {
        await updateDocumentTypeApi(id, payload);
        toast.success('Document Type updated successfully!');
      } else {
        await createDocumentTypeApi(payload);
        toast.success('Document Type created successfully!');
      }
      navigate('/admin/academics/document-types');
    } catch (err) {
      toast.error(err.message || 'Failed to save document type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Document Type' : 'Add Document Type'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/document-types">Document Type</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Document Type' : 'Add Document Type'}
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
                    <h4 className="text-dark mb-0">Document Type</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Document Type Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control required"
                          name="document_type_name"
                          id="document_type_name"
                          value={formData.document_type_name}
                          onChange={handleChange}
                          placeholder="e.g. Birth Certificate, Aadhar Card"
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
                          className="form-select required"
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
                    onClick={() => navigate('/admin/academics/document-types')}
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

export default EditDocumentType;
