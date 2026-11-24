import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  requestStudentChangePasswordOtpApi,
  changeStudentPasswordApi,
} from '../../api/studentAuth.api';
import { toast } from 'react-toastify';

const StudentChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConPass, setShowConPass] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailMissingWarning, setEmailMissingWarning] = useState('');

  // OTP Modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const triggerOtpRequest = async () => {
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
      setRequestingOtp(true);
      setOtpError('');
      setEmailMissingWarning('');

      const res = await requestStudentChangePasswordOtpApi(formData);
      const resData = res?.data?.data || res?.data || res;
      const masked = resData?.maskedEmail || 'your registered email';

      setOtpMaskedEmail(masked);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCooldown(30);
      setOtpModalOpen(true);
      toast.info(
        res?.data?.message || res?.message || `A 6-digit verification code has been sent to ${masked}`
      );
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.message || 'Failed to send verification OTP.';
      if (errData?.errors?.emailMissing || errData?.data?.emailMissing) {
        setEmailMissingWarning(msg);
      }
      toast.error(msg);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await triggerOtpRequest();
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    if (otpError) setOtpError('');
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    if (otpError) setOtpError('');
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleConfirmPasswordChange = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otpDigits.join('');
    if (otpValue.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setSubmitting(true);
      setOtpError('');
      const res = await changeStudentPasswordApi({
        ...formData,
        otp: otpValue,
      });
      if (res.data?.status || res.data?.success) {
        toast.success(res.data?.message || 'Password changed successfully!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setOtpModalOpen(false);
      } else {
        const msg = res.data?.message || 'Failed to update password.';
        setOtpError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error updating password.';
      setOtpError(msg);
      toast.error(msg);
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
            {/* Light Card Header */}
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
              {emailMissingWarning && (
                <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
                  <i className="ti ti-alert-triangle fs-20 me-2"></i>
                  <div>{emailMissingWarning}</div>
                </div>
              )}

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
                  <small className="text-muted mt-1 d-block">
                    <i className="fa-solid fa-circle-info me-1 text-primary"></i>
                    If you haven&apos;t changed your password yet, your default password is your Date of Birth (e.g. DD-MM-YYYY or YYYY-MM-DD).
                  </small>
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
                    disabled={requestingOtp || submitting}
                  >
                    {requestingOtp ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Sending OTP...
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

      {/* 6-Digit Email OTP Confirmation Modal */}
      {otpModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <i className="ti ti-shield-lock text-primary fs-20 me-2"></i>
                  Confirm Password Change
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  disabled={submitting}
                  onClick={() => setOtpModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleConfirmPasswordChange}>
                <div className="modal-body p-4">
                  <p className="text-muted fs-13 mb-3">
                    Enter the 6-digit verification code sent to{' '}
                    <strong className="text-dark">{otpMaskedEmail}</strong> to confirm changing your password.
                  </p>

                  {otpError && (
                    <div className="alert alert-danger py-2 px-3 fs-13 mb-3">
                      <i className="ti ti-alert-circle me-1"></i>
                      {otpError}
                    </div>
                  )}

                  <div
                    className="d-flex justify-content-between gap-2 mb-3"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="form-control text-center fw-bold fs-18"
                        style={{ height: '48px' }}
                        disabled={submitting}
                      />
                    ))}
                  </div>

                  <div className="d-flex align-items-center justify-content-between fs-13">
                    <span className="text-muted">Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-primary fw-semibold text-decoration-none"
                      disabled={otpCooldown > 0 || requestingOtp || submitting}
                      onClick={triggerOtpRequest}
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-top py-2.5 px-4">
                  <button
                    type="button"
                    className="btn btn-light border"
                    disabled={submitting}
                    onClick={() => setOtpModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                    disabled={submitting || otpDigits.join('').length !== 6}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Verifying & Updating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>Confirm & Update
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentChangePassword;
