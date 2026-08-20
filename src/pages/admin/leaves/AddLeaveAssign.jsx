import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchLeaveTypeByIdApi,
  createLeaveTypeApi,
  updateLeaveTypeApi,
} from '../../../api/adminLeave.api';

const AddLeaveAssign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [role, setRole] = useState('1'); // '1' = Teacher, '2' = User
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Rows state for Add mode (or single row for Edit mode)
  const [leaveRows, setLeaveRows] = useState([
    {
      id: null,
      leave_name: '',
      need_document: '0',
      no_leave: '1',
      sort_order: '1',
      status: '1',
    },
  ]);

  // Load existing data in Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadDetails = async () => {
        try {
          setLoading(true);
          const res = await fetchLeaveTypeByIdApi(id);
          if (res?.data?.type) {
            const t = res.data.type;
            setRole(String(t.role || '1'));
            setLeaveRows([
              {
                id: t.id,
                leave_name: t.leave_name || '',
                need_document: String(t.need_document || '0'),
                no_leave: String(t.no_leave || '1'),
                sort_order: String(t.sort_order || '1'),
                status: String(t.status !== undefined ? t.status : '1'),
              },
            ]);
          }
        } catch (err) {
          console.error('Error fetching leave assign details:', err);
          toast.error('Failed to load leave assignment details.');
        } finally {
          setLoading(false);
        }
      };

      loadDetails();
    }
  }, [isEditMode, id]);

  // Add another row
  const addLeaveRow = () => {
    setLeaveRows((prev) => [
      ...prev,
      {
        id: null,
        leave_name: '',
        need_document: '0',
        no_leave: '1',
        sort_order: String(prev.length + 1),
        status: '1',
      },
    ]);
  };

  // Remove a row
  const removeLeaveRow = (index) => {
    if (leaveRows.length <= 1) return;
    setLeaveRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update specific row field
  const handleRowChange = (index, field, value) => {
    setLeaveRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role) {
      toast.warning('Please select a Role.');
      return;
    }

    // Validation
    for (let i = 0; i < leaveRows.length; i++) {
      const row = leaveRows[i];
      if (!row.leave_name || !row.leave_name.trim()) {
        toast.warning(`Please enter Leave Name for Row #${i + 1}`);
        return;
      }
      if (!row.no_leave || Number(row.no_leave) < 1) {
        toast.warning(`Please enter valid No of Leaves for Row #${i + 1}`);
        return;
      }
      if (!row.sort_order) {
        toast.warning(`Please enter Sort Order for Row #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        const row = leaveRows[0];
        await updateLeaveTypeApi(id, {
          role: Number(role),
          leave_name: row.leave_name.trim(),
          need_document: Number(row.need_document),
          no_leave: Number(row.no_leave),
          sort_order: Number(row.sort_order),
          status: Number(row.status),
        });
        toast.success('Leave assignment updated successfully!');
      } else {
        await createLeaveTypeApi({
          role: Number(role),
          leaveRows,
        });
        toast.success('Leave assignment(s) created successfully!');
      }

      navigate('/admin/leaves/assign');
    } catch (err) {
      console.error('Error saving leave assignment:', err);
      toast.error(err.response?.data?.message || 'Failed to save leave assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading leave assignment details...</p>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEditMode ? 'Edit Leave Assign' : 'Add Leave Assign'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/leaves/assign">Leave Assign</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEditMode ? 'Edit Leave Assign' : 'Add Leave Assign'}
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
                  <h4 className="text-dark mb-0 fw-bold">Leave Assign</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                <div className="row row-cols-md-6 mb-3">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium">
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="role"
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                      >
                        <option value="">select</option>
                        <option value="1">Teacher</option>
                        <option value="2">User</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div id="leaveRows">
                  {leaveRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="row align-items-end leave-row p-2 mb-2 bg-white rounded border"
                    >
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            Leave Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Leave Name (e.g. Medical Leaves, Casual Leaves)"
                            value={row.leave_name}
                            onChange={(e) => handleRowChange(idx, 'leave_name', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-md-2">
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            Need Document <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex mt-2 gap-3">
                            <div className="form-check cursor-pointer">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`need_document[${idx}]`}
                                id={`need_doc_no_${idx}`}
                                value="0"
                                checked={row.need_document === '0'}
                                onChange={() => handleRowChange(idx, 'need_document', '0')}
                              />
                              <label className="form-check-label ms-1" htmlFor={`need_doc_no_${idx}`}>
                                No
                              </label>
                            </div>
                            <div className="form-check cursor-pointer">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`need_document[${idx}]`}
                                id={`need_doc_yes_${idx}`}
                                value="1"
                                checked={row.need_document === '1'}
                                onChange={() => handleRowChange(idx, 'need_document', '1')}
                              />
                              <label className="form-check-label ms-1" htmlFor={`need_doc_yes_${idx}`}>
                                Yes
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-2">
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            No of Leaves <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            className="form-control"
                            value={row.no_leave}
                            onChange={(e) => handleRowChange(idx, 'no_leave', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-md-2">
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            Sort Order <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            className="form-control"
                            value={row.sort_order}
                            onChange={(e) => handleRowChange(idx, 'sort_order', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-md-2">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Status</label>
                          <select
                            className="form-select"
                            value={row.status}
                            onChange={(e) => handleRowChange(idx, 'status', e.target.value)}
                          >
                            <option value="1">Active</option>
                            <option value="2">Inactive</option>
                          </select>
                        </div>
                      </div>

                      {!isEditMode && leaveRows.length > 1 && (
                        <div className="col-md-1 mb-3 text-center">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-icon btn-sm"
                            onClick={() => removeLeaveRow(idx)}
                            title="Remove Row"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!isEditMode && (
                  <div className="mb-3 pt-3">
                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center"
                      onClick={addLeaveRow}
                    >
                      <i className="ti ti-circle-plus me-2"></i>Add New
                    </button>
                  </div>
                )}
              </div>

              <div className="text-end mb-2 p-3 border-top">
                <button
                  type="button"
                  onClick={() => navigate('/admin/leaves/assign')}
                  className="btn btn-light me-3"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
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

export default AddLeaveAssign;
