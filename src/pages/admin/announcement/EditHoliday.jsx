import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchHolidayByIdApi,
  createHolidayApi,
  updateHolidayApi,
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

const EditHoliday = () => {
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
      const loadHoliday = async () => {
        try {
          setLoading(true);
          const res = await fetchHolidayByIdApi(id);
          const h = res?.data || res;
          if (h) {
            let range = getTodayDateRange();
            if (h.from_date && h.to_date) {
              range = `${formatDateSlash(h.from_date)} - ${formatDateSlash(h.to_date)}`;
            } else if (h.from_date) {
              range = `${formatDateSlash(h.from_date)} - ${formatDateSlash(h.from_date)}`;
            }

            setFormData({
              title: h.title || '',
              daterange: range,
              from_date: h.from_date ? h.from_date.split('T')[0] : '',
              to_date: h.to_date ? h.to_date.split('T')[0] : '',
              details: h.details || '',
              status: h.status !== undefined ? h.status : 1,
            });
          }
        } catch (err) {
          console.error('Error fetching holiday:', err);
          toast.error('Failed to load holiday details.');
        } finally {
          setLoading(false);
        }
      };
      loadHoliday();
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
      toast.error('Please enter a holiday title.');
      return;
    }
    if (!formData.daterange.trim()) {
      toast.error('Please select a holiday date or date range.');
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
        await updateHolidayApi(id, payload);
        toast.success('Holiday updated successfully.');
      } else {
        await createHolidayApi(payload);
        toast.success('Holiday added successfully.');
      }
      navigate('/admin/announcement/holiday');
    } catch (err) {
      console.error('Error saving holiday:', err);
      toast.error(err?.response?.data?.message || 'Failed to save holiday.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          <span className="text-muted">Loading holiday details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1 text-dark fw-semibold">{isEdit ? 'Edit Holiday' : 'Add Holiday'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/announcement/holiday">Holiday</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Holiday' : 'Add Holiday'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            {/* Holiday Information Card */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fs-16 fw-semibold">Holiday</h4>
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
                        placeholder="e.g. Diwali Vacation / Winter Break"
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
                        placeholder="Write detailed holiday notes, campus closure notices, re-opening dates, etc..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Footer Action Buttons */}
              <div className="text-end mb-2 p-3 bg-white border-top">
                <button
                  type="button"
                  onClick={() => navigate('/admin/announcement/holiday')}
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
            {/* /Holiday Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHoliday;
