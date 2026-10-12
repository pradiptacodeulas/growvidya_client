import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHostelByIdApi,
  createHostelApi,
  updateHostelApi,
} from '../../../api/adminHostel.api';
import { decodeParam } from '../../../utils/idHelper';

const EditHostel = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    hostel_name: '',
    hostel_fee: '0.00',
    sort_order: '1',
    status: '1',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const loadHostel = async () => {
        try {
          setLoading(true);
          const res = await fetchHostelByIdApi(id);
          const h = res?.data || res;
          if (h) {
            setFormData({
              hostel_name: h.hostel_name || '',
              hostel_fee: h.hostel_fee !== undefined ? String(h.hostel_fee) : '0.00',
              sort_order: h.sort_order !== undefined ? String(h.sort_order) : '1',
              status: h.status !== undefined ? String(h.status) : '1',
            });
          }
        } catch (err) {
          console.error('Error fetching hostel:', err);
          toast.error('Failed to load hostel details.');
        } finally {
          setLoading(false);
        }
      };
      loadHostel();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hostel_name.trim()) {
      toast.error('Please enter a hostel name.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateHostelApi(id, formData);
        toast.success('Hostel updated successfully.');
      } else {
        await createHostelApi(formData);
        toast.success('Hostel created successfully.');
      }
      navigate('/admin/hostel/list');
    } catch (err) {
      console.error('Error saving hostel:', err);
      toast.error(err?.response?.data?.message || 'Failed to save hostel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Hostel List' : 'Add Hostel List'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/hostel/list">Hostel List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Hostel List' : 'Add Hostel List'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">Hostel List</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border spinner-border-sm text-primary me-2"
                      role="status"
                    ></div>
                    <span className="text-muted">Loading hostel details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Hostel Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="hostel_name"
                          id="hostel_name"
                          value={formData.hostel_name}
                          onChange={handleChange}
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
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Hostel Fee (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          name="hostel_fee"
                          id="hostel_fee"
                          value={formData.hostel_fee}
                          onChange={handleChange}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select select"
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
                )}
              </div>

              <div className="text-end mb-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/hostel/list')}
                  className="btn btn-light me-3"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loading}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* /Personal Information */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHostel;
