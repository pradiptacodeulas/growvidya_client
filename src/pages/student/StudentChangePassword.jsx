import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changeStudentPasswordApi } from '../../api/studentAuth.api';
import { toast } from 'react-toastify';

const StudentChangePassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConPass, setShowConPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!formData.newPassword) {
      toast.error('Please enter your new password.');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await changeStudentPasswordApi(formData);
      if (res.data?.status || res.data?.success) {
        toast.success(res.data?.message || 'Password changed successfully!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(res.data?.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(err.response?.data?.message || 'Error updating password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content container-fluid">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4">
        <div className="my-auto">
          <h3 className="page-title mb-1 fw-bold text-dark">Change Password</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/student/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Change Password
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-10">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            {/* Light Card Header (Clean Non-Dark Style) */}
            <div className="card-header bg-white border-bottom p-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="avatar avatar-md bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className="fa-solid fa-lock fs-20 text-primary"></i>
                </div>
                <div>
                  <h5 className="text-dark mb-0 fw-bold">Security Settings</h5>
                  <p className="text-muted mb-0 fs-13">
                    Update your password to keep your student account secure.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <form id="changePasswordForm" onSubmit={handleSubmit}>
                {/* Current Password */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark fs-14">
                    Current Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="fa-solid fa-key text-muted"></i>
                    </span>
                    <input
                      type={showCurPass ? 'text' : 'password'}
                      className="form-control border-start-0 border-end-0 shadow-none"
                      style={{ paddingLeft: '10px' }}
                      id="cur_pass"
                      name="currentPassword"
                      placeholder="Enter current password"
                      required
                      value={formData.currentPassword}
                      onChange={handleChange}
                    />
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-light shadow-none"
                      type="button"
                      onClick={() => setShowCurPass(!showCurPass)}
                      title={showCurPass ? 'Hide password' : 'Show password'}
                    >
                      <i
                        className={`fa-solid ${
                          showCurPass ? 'fa-eye' : 'fa-eye-slash'
                        } text-muted`}
                      ></i>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark fs-14">
                    New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="fa-solid fa-lock text-muted"></i>
                    </span>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      className="form-control border-start-0 border-end-0 shadow-none"
                      style={{ paddingLeft: '10px' }}
                      id="new_pass"
                      name="newPassword"
                      placeholder="Enter new password (min. 6 chars)"
                      required
                      minLength={6}
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-light shadow-none"
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      title={showNewPass ? 'Hide password' : 'Show password'}
                    >
                      <i
                        className={`fa-solid ${
                          showNewPass ? 'fa-eye' : 'fa-eye-slash'
                        } text-muted`}
                      ></i>
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark fs-14">
                    Confirm New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="fa-solid fa-lock text-muted"></i>
                    </span>
                    <input
                      type={showConPass ? 'text' : 'password'}
                      className="form-control border-start-0 border-end-0 shadow-none"
                      style={{ paddingLeft: '10px' }}
                      id="con_pass"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-light shadow-none"
                      type="button"
                      onClick={() => setShowConPass(!showConPass)}
                      title={showConPass ? 'Hide password' : 'Show password'}
                    >
                      <i
                        className={`fa-solid ${
                          showConPass ? 'fa-eye' : 'fa-eye-slash'
                        } text-muted`}
                      ></i>
                    </button>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="d-flex align-items-center justify-content-end gap-2 pt-2">
                  <Link
                    to="/student/dashboard"
                    className="btn btn-light px-4 py-2 fw-semibold shadow-none border"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
                    id="savePassBtn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check me-1"></i> Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentChangePassword;
