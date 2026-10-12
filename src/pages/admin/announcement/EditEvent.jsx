import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchEventByIdApi,
  createEventApi,
  updateEventApi,
} from '../../../api/adminAnnouncement.api';
import RichTextEditor from '../../../components/common/RichTextEditor';
import DateRangePicker from '../../../components/common/DateRangePicker';
import { decodeParam } from '../../../utils/idHelper';

const formatDateSlash = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const getTodayDateRange = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const todayStr = `${day}/${month}/${year}`;
  return `${todayStr} - ${todayStr}`;
};

const EditEvent = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    daterange: getTodayDateRange(),
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    details: '',
    status: 1,
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const loadEvent = async () => {
        try {
          setLoading(true);
          const res = await fetchEventByIdApi(id);
          const ev = res?.data || res;
          if (ev) {
            let range = getTodayDateRange();
            if (ev.from_date && ev.to_date) {
              range = `${formatDateSlash(ev.from_date)} - ${formatDateSlash(ev.to_date)}`;
            } else if (ev.from_date) {
              range = `${formatDateSlash(ev.from_date)} - ${formatDateSlash(ev.from_date)}`;
            }

            setFormData({
              title: ev.title || '',
              daterange: range,
              from_date: ev.from_date ? ev.from_date.split('T')[0] : '',
              to_date: ev.to_date ? ev.to_date.split('T')[0] : '',
              details: ev.details || '',
              status: ev.status !== undefined ? ev.status : 1,
            });
          }
        } catch (err) {
          console.error('Error fetching event:', err);
          toast.error('Failed to load event details.');
        } finally {
          setLoading(false);
        }
      };
      loadEvent();
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateRangeChange = ({ startDateFormatted, endDateFormatted, rangeFormatted }) => {
    setFormData((prev) => ({
      ...prev,
      daterange: rangeFormatted,
      from_date: startDateFormatted,
      to_date: endDateFormatted,
    }));
  };

  const handleDetailsChange = (html) => {
    setFormData((prev) => ({ ...prev, details: html }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an event title.');
      return;
    }
    if (!formData.daterange.trim()) {
      toast.error('Please select an event date or date range.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        daterange: formData.daterange.trim(),
        from_date: formData.from_date,
        to_date: formData.to_date,
        details: formData.details,
        status: formData.status,
      };

      if (isEdit) {
        await updateEventApi(id, payload);
        toast.success('Event updated successfully.');
      } else {
        await createEventApi(payload);
        toast.success('Event added successfully.');
      }
      navigate('/admin/announcement/event');
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error(err?.response?.data?.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          <span className="text-muted">Loading event details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 text-dark fw-semibold">{isEdit ? 'Edit Event' : 'Add Event'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/announcement/event">Event</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Event' : 'Add Event'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Event Information Card */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fs-16 fw-semibold">Event</h4>
                </div>
              </div>
              <div className="card-body pb-3 p-4">
                <div className="row">
                  {/* Title */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control text-dark"
                        name="title"
                        id="title"
                        required
                        placeholder="e.g. Annual Sports Meet 2026"
                        value={formData.title}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Dual Date Range Selection */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Date <span className="text-danger">*</span>
                      </label>
                      <DateRangePicker
                        value={formData.daterange}
                        startDate={formData.from_date}
                        endDate={formData.to_date}
                        onChange={handleDateRangeChange}
                        required
                        placeholder="DD/MM/YYYY - DD/MM/YYYY"
                      />
                    </div>
                  </div>

                  {/* Details with Rich Text Editor */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">Details</label>
                      <RichTextEditor
                        value={formData.details}
                        onChange={handleDetailsChange}
                        placeholder="Write detailed event information, schedule, guidelines, etc..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Footer Action Buttons */}
              <div className="text-end mb-2 p-3 bg-white border-top">
                <button
                  type="button"
                  onClick={() => navigate('/admin/announcement/event')}
                  className="btn btn-light me-3 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 d-inline-flex align-items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
            {/* /Event Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
