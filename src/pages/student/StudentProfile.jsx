import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchStudentProfileApi, updateStudentProfileApi } from '../../api/studentPortal.api';
import { updateStudentState } from '../../store/slices/studentAuthSlice';
import maleUserDefault from '../../assets/male-user.png';
import { resolveImageUrl } from '../../utils/url.util';
import { toast } from 'react-toastify';

const StudentProfile = () => {
  const dispatch = useDispatch();
  const { student: authStudent } = useSelector((state) => state.studentAuth);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '1',
    date_of_birth: '',
    blood_group: '',
    primary_contact_number: '',
    email_address: '',
    religion: '',
    caste: '',
    category: '',
    mother_tongue: '',
    language_known: '',
    picture: '',
  });
  const [imagePreview, setImagePreview] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentProfileApi();
      const data = res?.data?.data || res?.data || null;
      if (data) {
        setStudent(data);
        populateForm(data);
      }
    } catch (err) {
      console.error('Failed to load student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data) => {
    if (!data) return;
    setFormData({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      gender: String(data.gender || '1'),
      date_of_birth: data.date_of_birth ? data.date_of_birth.substring(0, 10) : '',
      blood_group: data.blood_group || '',
      primary_contact_number: data.primary_contact_number || '',
      email_address: data.email_address || '',
      religion: data.religion || '',
      caste: data.caste || '',
      category: data.category || '',
      mother_tongue: data.mother_tongue || '',
      language_known: data.language_known || '',
      picture: '',
    });
    setImagePreview(resolveImageUrl(data.picture) || '');
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, picture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.warning('First name is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateStudentProfileApi(formData);
      if (res?.data?.success) {
        toast.success('Profile updated successfully!');
        setShowEditModal(false);
        const updatedStudent = res.data.data || { ...student, ...formData };
        setStudent(updatedStudent);
        dispatch(updateStudentState(updatedStudent));
      } else {
        toast.error(res?.data?.message || 'Failed to update profile.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const activeStudent = student || authStudent;
  const studentPhoto = resolveImageUrl(activeStudent?.picture) || maleUserDefault;
  const fullName =
    activeStudent?.full_name ||
    `${activeStudent?.first_name || ''} ${activeStudent?.last_name || ''}`.trim() ||
    'Student';

  return (
    <div className="content content-two">
      {/* Student Profile Banner (Clean Light Theme) */}
      <div className="card border shadow-sm mb-4 bg-white rounded-3">
        <div className="card-body p-4">
          <div className="d-md-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <div
                className="avatar avatar-xxl rounded-circle border border-3 border-primary-subtle flex-shrink-0 me-3 shadow-sm"
                style={{ width: '72px', height: '72px', overflow: 'hidden' }}
              >
                <img
                  src={studentPhoto}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = maleUserDefault;
                  }}
                />
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary mb-1 fs-12 border">
                  Student Profile
                </span>
                <h3 className="card-title mb-1 fw-bold text-dark">{fullName}</h3>
                <p className="card-text text-muted fs-13 mb-0">
                  <span className="me-3">
                    <strong className="text-dark">Class:</strong> {activeStudent?.class_name || 'N/A'}{' '}
                    {activeStudent?.section_name ? `(${activeStudent.section_name})` : ''}
                  </span>
                  <span className="me-3">
                    <strong className="text-dark">Roll No:</strong> #{activeStudent?.roll_number || 'N/A'}
                  </span>
                  <span>
                    <strong className="text-dark">Admission No:</strong>{' '}
                    {activeStudent?.admission_number || 'N/A'}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-1"
              onClick={() => {
                populateForm(activeStudent);
                setShowEditModal(true);
              }}
            >
              <i className="ti ti-edit fs-15"></i>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-primary me-2"></div>
          Loading student profile...
        </div>
      ) : (
        <div className="row g-4">
          {/* Basic & Academic Information */}
          <div className="col-12 col-lg-6">
            <div className="card border shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0 fw-bold fs-15 text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-id-badge-2 text-primary fs-18"></i>
                  Academic & Personal Information
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">First Name</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.first_name || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Last Name</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.last_name || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Gender</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.gender_name || activeStudent?.gender || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Date of Birth</span>
                    <span className="fw-semibold text-dark fs-13">
                      {activeStudent?.date_of_birth ? new Date(activeStudent.date_of_birth).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Blood Group</span>
                    <span className="badge bg-danger-subtle text-danger fs-12 fw-semibold">
                      {activeStudent?.blood_group_name || activeStudent?.blood_group || 'N/A'}
                    </span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Admission Date</span>
                    <span className="fw-semibold text-dark fs-13">
                      {activeStudent?.admission_date ? new Date(activeStudent.admission_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Religion</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.religion_name || activeStudent?.religion || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Category</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.category_name || activeStudent?.category || 'General'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Mother Tongue</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.mother_tongue || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted fs-12 d-block">Languages Known</span>
                    <span className="fw-semibold text-dark fs-13">{activeStudent?.language_known || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Parent Information */}
          <div className="col-12 col-lg-6">
            <div className="card border shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0 fw-bold fs-15 text-dark d-flex align-items-center gap-2">
                  <i className="ti ti-address-book text-primary fs-18"></i>
                  Contact & Parent Details
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <span className="text-muted fs-12 d-block">Primary Contact Number</span>
                    <span className="fw-semibold text-dark fs-13">
                      <i className="ti ti-phone text-muted me-1"></i>
                      {activeStudent?.primary_contact_number || 'N/A'}
                    </span>
                  </div>
                  <div className="col-12">
                    <span className="text-muted fs-12 d-block">Email Address</span>
                    <span className="fw-semibold text-dark fs-13">
                      <i className="ti ti-mail text-muted me-1"></i>
                      {activeStudent?.email_address || 'N/A'}
                    </span>
                  </div>
                  <div className="col-12 border-top pt-3">
                    <h6 className="fw-bold text-dark fs-13 mb-2">
                      <i className="ti ti-users me-1 text-primary"></i>Linked Parent / Guardian
                    </h6>
                    {activeStudent?.parent ? (
                      <div className="p-3 bg-light rounded-3 border">
                        <span className="d-block fw-bold text-dark fs-13">
                          {activeStudent.parent.first_name} {activeStudent.parent.last_name || ''} ({activeStudent.parent.relation || 'Parent'})
                        </span>
                        <small className="text-muted d-block mt-1">
                          Phone: {activeStudent.parent.phone || 'N/A'} | Email: {activeStudent.parent.email || 'N/A'}
                        </small>
                      </div>
                    ) : (
                      <p className="text-muted fs-12 mb-0">Parent details recorded on institutional file.</p>
                    )}
                  </div>
                  <div className="col-12 border-top pt-3">
                    <h6 className="fw-bold text-dark fs-13 mb-1">
                      <i className="ti ti-map-pin me-1 text-primary"></i>Residential Address
                    </h6>
                    <p className="text-muted fs-13 mb-0">
                      {activeStudent?.address?.current_address || activeStudent?.current_address || 'Address provided upon admission.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark fs-16">
                  <i className="ti ti-edit text-primary me-2"></i>Edit My Profile
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                ></button>
              </div>
              <form onSubmit={handleSaveProfile}>
                <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {/* Photo Upload Section */}
                  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3 border">
                    <div
                      className="avatar avatar-xl rounded-circle border overflow-hidden flex-shrink-0 bg-white shadow-sm"
                      style={{ width: '64px', height: '64px' }}
                    >
                      <img
                        src={imagePreview || studentPhoto}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <label className="form-label fs-13 fw-bold mb-1 text-dark">Profile Picture</label>
                      <input
                        type="file"
                        className="form-control form-control-sm"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      <small className="text-muted fs-11">JPG, PNG or WEBP (Max 2MB)</small>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Gender</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="1">Male</option>
                        <option value="2">Female</option>
                        <option value="3">Others</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Primary Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.primary_contact_number}
                        onChange={(e) => setFormData({ ...formData, primary_contact_number: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email_address}
                        onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Blood Group</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. O+, A+, B+"
                        value={formData.blood_group}
                        onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fs-13 fw-semibold text-dark">Mother Tongue</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.mother_tongue}
                        onChange={(e) => setFormData({ ...formData, mother_tongue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 bg-light rounded-bottom-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                    onClick={() => setShowEditModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm rounded-pill px-4 shadow-sm"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
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

export default StudentProfile;
