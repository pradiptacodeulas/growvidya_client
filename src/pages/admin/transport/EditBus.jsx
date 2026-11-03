import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchVehicleByIdApi,
  createVehicleApi,
  updateVehicleApi,
} from '../../../api/adminTransport.api';
import { decodeParam } from '../../../utils/idHelper';
import { resolveImageUrl } from '../../../utils/url.util';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit

/**
 * Compresses/resizes an image canvas-side if needed to ensure it is <= 1 MB
 */
const compressImageIfNeeded = async (file) => {
  if (file.size <= MAX_IMAGE_SIZE_BYTES) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try JPEG with 0.8 quality
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size <= MAX_IMAGE_SIZE_BYTES) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              });
              resolve(compressedFile);
            } else if (blob) {
              // Try higher compression with 0.6 quality
              canvas.toBlob(
                (blob2) => {
                  if (blob2 && blob2.size <= MAX_IMAGE_SIZE_BYTES) {
                    const compressedFile2 = new File([blob2], file.name.replace(/\.[^.]+$/, '.jpg'), {
                      type: 'image/jpeg',
                    });
                    resolve(compressedFile2);
                  } else {
                    reject(
                      new Error(
                        `Unable to compress image under 1 MB (result was ${(
                          blob.size / (1024 * 1024)
                        ).toFixed(2)} MB). Please choose a smaller image.`
                      )
                    );
                  }
                },
                'image/jpeg',
                0.6
              );
            } else {
              reject(new Error('Failed to compress image.'));
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};

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
  const [compressing, setCompressing] = useState(false);

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
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please select a valid image file (JPG, PNG, WEBP, SVG).');
      e.target.value = '';
      return;
    }

    try {
      setCompressing(true);
      const readyFile = await compressImageIfNeeded(file);
      const formattedSize =
        readyFile.size < 1024 * 1024
          ? `${(readyFile.size / 1024).toFixed(1)} KB`
          : `${(readyFile.size / (1024 * 1024)).toFixed(2)} MB`;

      if (readyFile.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`Image size is ${formattedSize}, which exceeds the 1 MB limit.`);
        e.target.value = '';
        return;
      }
      setImageFile(readyFile);
      setImagePreview(URL.createObjectURL(readyFile));
      setFileSizeInfo(formattedSize);
      setRemoveImage(false);
    } catch (err) {
      toast.error(err.message || 'Image exceeds the 1 MB limit.');
      e.target.value = '';
    } finally {
      setCompressing(false);
    }
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

    try {
      setSubmitting(true);
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
      toast.error(err.response?.data?.message || 'Failed to save bus.');
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
                          className="form-control"
                          name="number_plate"
                          id="number_plate"
                          value={formData.number_plate}
                          onChange={handleChange}
                          placeholder="e.g. WB-01-AB-1234"
                          required
                        />
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
                          disabled={compressing}
                        />
                        {compressing && (
                          <div className="text-muted fs-11 mt-1">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Optimizing image to fit under 1 MB...
                          </div>
                        )}
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
