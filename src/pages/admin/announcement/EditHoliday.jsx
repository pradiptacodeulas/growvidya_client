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

// Timezone-safe local Date parser & formatter (prevents UTC -1 day shift)
const parseLocalDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
  }
  const str = String(raw).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    return new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
  }
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const toLocalYmd = (raw) => {
  const d = parseLocalDate(raw);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateSlash = (raw) => {
  const d = parseLocalDate(raw);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getTodayDateRange = () => {
  const todayStr = formatDateSlash(new Date());
  return `${todayStr} - ${todayStr}`;
};

const EditHoliday = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const todayYmd = toLocalYmd(new Date());

  const [formData, setFormData] = useState({
    title: '',
    daterange: getTodayDateRange(),
    from_date: todayYmd,
    to_date: todayYmd,
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
            const fromYmd = h.from_ymd || toLocalYmd(h.from_date);
            const toYmd = h.to_ymd || toLocalYmd(h.to_date) || fromYmd;
            const range =
              fromYmd && toYmd
                ? `${formatDateSlash(fromYmd)} - ${formatDateSlash(toYmd)}`
                : getTodayDateRange();

            setFormData({
              title: h.title || '',
              daterange: range,
              from_date: fromYmd || todayYmd,
              to_date: toYmd || fromYmd || todayYmd,
              details: h.details || '',
              status: Number(h.status) === 2 || Number(h.status) === 0 ? 2 : 1,
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
  }, [id, isEdit, todayYmd]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'status' ? Number(value) : value,
    }));
  };

  const handleDateRangeChange = ({ startDateFormatted, endDateFormatted, rangeFormatted }) => {
    setFormData((prev) => ({
      ...prev,
      daterange: rangeFormatted,
      from_date: startDateFormatted,
      to_date: endDateFormatted || startDateFormatted,
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
    if (!formData.from_date) {
      toast.error('Please select a holiday date or date range.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        daterange: formData.daterange.trim(),
        from_date: formData.from_date,
        to_date: formData.to_date || formData.from_date,
        details: formData.details,
        status: Number(formData.status) === 2 ? 2 : 1,
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
                <Link to="/admin/announcement/holiday">Holidays</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Holiday' : 'Add Holiday'}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light border-bottom">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fs-16 fw-semibold">Holiday Information</h4>
                </div>
              </div>
              <div className="card-body pb-3 p-4">
                <div className="row">
                  {/* Title */}
                  <div className="col-md-5">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Holiday Title <span className="text-danger">*</span>
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
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">
                        Holiday Date / Range <span className="text-danger">*</span>
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

                  {/* Status */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1">Status</label>
                      <select
                        name="status"
                        className="form-select text-dark"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                      </select>
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHoliday;
