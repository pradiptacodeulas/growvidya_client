import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHostelRoomByIdApi,
  createHostelRoomApi,
  updateHostelRoomApi,
  fetchHostelsApi,
} from '../../../api/adminHostel.api';
import { decodeParam } from '../../../utils/idHelper';

const EditHostelRoom = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [hostels, setHostels] = useState([]);
  const [formData, setFormData] = useState({
    hostel_id: '',
    room_number: '',
    sort_order: '1',
    status: '1',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // Load hostels dropdown
        const hRes = await fetchHostelsApi().catch(() => null);
        const hostelList = hRes?.data?.hostels || hRes?.hostels || hRes?.data || [];
        setHostels(Array.isArray(hostelList) ? hostelList : []);

        if (isEdit) {
          const roomRes = await fetchHostelRoomByIdApi(id);
          const r = roomRes?.data || roomRes;
          if (r) {
            setFormData({
              hostel_id: r.hostel_id ? String(r.hostel_id) : '',
              room_number: r.room_number || '',
              sort_order: r.sort_order !== undefined ? String(r.sort_order) : '1',
              status: r.status !== undefined ? String(r.status) : '1',
            });
          }
        } else if (Array.isArray(hostelList) && hostelList.length > 0) {
          setFormData((prev) => ({ ...prev, hostel_id: String(hostelList[0].id) }));
        }
      } catch (err) {
        console.error('Error initializing hostel room form:', err);
        toast.error('Failed to load form details.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hostel_id) {
      toast.error('Please select a hostel.');
      return;
    }
    if (!formData.room_number.trim()) {
      toast.error('Please enter a room number.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateHostelRoomApi(id, formData);
        toast.success('Hostel room updated successfully.');
      } else {
        await createHostelRoomApi(formData);
        toast.success('Hostel room created successfully.');
      }
      navigate('/admin/hostel/rooms');
    } catch (err) {
      console.error('Error saving hostel room:', err);
      toast.error(err?.response?.data?.message || 'Failed to save hostel room.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Hostel Rooms' : 'Add Hostel Rooms'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/hostel/rooms">Hostel Rooms</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Hostel Rooms' : 'Add Hostel Rooms'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0">Hostel Rooms</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border spinner-border-sm text-primary me-2"
                      role="status"
                    ></div>
                    <span className="text-muted">Loading room details...</span>
                  </div>
                ) : (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Hostel Name <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          name="hostel_id"
                          value={formData.hostel_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Hostel</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.hostel_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Room Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="room_number"
                          value={formData.room_number}
                          onChange={handleChange}
                          placeholder="e.g. 101, 102"
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
                          value={formData.sort_order}
                          onChange={handleChange}
                          placeholder="1"
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

              <div className="card-footer bg-white border-top text-end py-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/hostel/rooms')}
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
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHostelRoom;
