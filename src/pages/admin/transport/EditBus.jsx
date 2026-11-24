import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchVehicleByIdApi,
  createVehicleApi,
  updateVehicleApi,
  checkVehicleDuplicateApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';
import { resolveImageUrl } from '../../../utils/url.util';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit

const EditBus = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    number_plate: '',
    seat: '',
    color: '',
    status: '1',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [fileSizeInfo, setFileSizeInfo] = useState('');
  const [numberPlateError, setNumberPlateError] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBusData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchVehicleByIdApi(id);
      const data = res?.data?.vehicle || res?.data || res?.vehicle;
      if (data) {
        setFormData({
          name: data.name || '',
          number_plate: data.number_plate || '',
          seat: data.seat !== undefined ? String(data.seat) : '',
          color: data.color || '',
          status: String(data.status !== undefined ? data.status : 1),
        });
        if (data.image) {
          setExistingImage(data.image);
          setImagePreview(resolveImageUrl(data.image));
          setRemoveImage(false);
        }
      } else {
        toast.error('Bus details not found.');
        navigate('/admin/transport/bus');
      }
    } catch (err) {
      console.error('Error fetching bus details:', err);
      toast.error('Failed to load bus details.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadBusData();
  }, [loadBusData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'number_plate' && numberPlateError) {
      setNumberPlateError('');
    }
  };

  const handleNumberPlateBlur = async (e) => {
    const val = (e.target.value || '').trim();
    if (!val) {
      setNumberPlateError('');
      return;
    }
    try {
      const res = await checkVehicleDuplicateApi({
        number_plate: val,
        exclude_id: id || undefined,
      });
      if (res?.data?.isNumberPlateDuplicate) {
        setNumberPlateError(res?.data?.message || 'A bus with this number plate already exists.');
      } else {
        setNumberPlateError('');
      }
    } catch {
      // ignore error on live blur check
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please select a valid image file (JPG, PNG, WEBP, SVG).');
      e.target.value = '';
      return;
    }

    const formattedSize =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Image size is ${formattedSize}, which exceeds the 1 MB limit. Please upload an image under 1 MB.`);
      e.target.value = '';
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFileSizeInfo(formattedSize);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileSizeInfo('');
    setRemoveImage(true);
    const input = document.getElementById('bus_image_input');
    if (input) input.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Please enter Bus Name.');
      return;
    }
    if (!formData.number_plate.trim()) {
      toast.warning('Please enter Bus Number Plate.');
      return;
    }
    if (!formData.seat) {
      toast.warning('Please enter Seat Capacity.');
      return;
    }
    if (!formData.color.trim()) {
      toast.warning('Please enter Bus Color.');
      return;
    }
    if (numberPlateError) {
      toast.warning(numberPlateError);
      return;
    }

    try {
      setSubmitting(true);
      const dupRes = await checkVehicleDuplicateApi({
        number_plate: formData.number_plate.trim(),
        exclude_id: id || undefined,
      });
      if (dupRes?.data?.isNumberPlateDuplicate) {
        const msg = dupRes?.data?.message || 'A bus with this number plate already exists.';
        setNumberPlateError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }

      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('number_plate', formData.number_plate.trim());
      payload.append('seat', formData.seat);
      payload.append('color', formData.color.trim());
      payload.append('status', formData.status);

      if (imageFile) {
        payload.append('image', imageFile);
      } else if (removeImage) {
        payload.append('remove_image', 'true');
      }

      if (isEditing) {
        await updateVehicleApi(id, payload);
        toast.success('Bus updated successfully!');
      } else {
        await createVehicleApi(payload);
        toast.success('Bus added successfully!');
      }
      navigate('/admin/transport/bus');
    } catch (err) {
      console.error('Error saving bus:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save bus.';
      if (errMsg.toLowerCase().includes('number plate')) {
        setNumberPlateError(errMsg);
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditing ? 'Edit Bus' : 'Add Bus'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/transport/bus">Bus List</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditing ? 'Edit Bus' : 'Add Bus'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Bus Information Card */}
            <div className="card">
              <div className="card-header bg-light">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark">{isEditing ? 'Edit Bus' : 'Add Bus'}</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted">Loading bus details...</span>
                  </div>
                ) : (
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Tata Marcopolo"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bus Number Plate <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${numberPlateError ? 'is-invalid' : ''}`}
                          name="number_plate"
                          id="number_plate"
                          value={formData.number_plate}
                          onChange={handleChange}
                          onBlur={handleNumberPlateBlur}
                          placeholder="e.g. WB-01-AB-1234"
                          required
                        />
                        {numberPlateError && (
                          <div className="invalid-feedback d-block">{numberPlateError}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Seat (Total Number)<span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="150"
                          className="form-control"
                          name="seat"
                          id="seat"
                          value={formData.seat}
                          onChange={handleChange}
                          placeholder="e.g. 35"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Color<span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="color"
                          id="color"
                          value={formData.color}
                          onChange={handleChange}
                          placeholder="e.g. Yellow"
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

                    <div className="col-md-4">
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label mb-0">
                            Bus Image <small className="text-muted">(Optional, Max 1 MB)</small>
                          </label>
                          {fileSizeInfo && (
                            <span className="badge bg-light text-primary border fs-11">
                              {fileSizeInfo}
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          id="bus_image_input"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        {imagePreview && (
                          <div className="d-flex align-items-center gap-2 mt-2 p-1.5 bg-light rounded border">
                            <img
                              src={imagePreview}
                              alt="Bus Preview"
                              className="rounded border"
                              style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                            />
                            <div className="flex-grow-1 overflow-hidden">
                              <span className="fs-12 text-truncate d-block fw-medium">
                                {imageFile ? imageFile.name : 'Current Image'}
                              </span>
                              <span className="fs-11 text-success">
                                <i className="ti ti-check me-1"></i>Within 1 MB limit
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm btn-icon"
                              onClick={handleRemoveImage}
                              title="Remove Image"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-end mb-2 p-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/transport/bus')}
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
            {/* /Bus Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBus;
