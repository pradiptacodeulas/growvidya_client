import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../api/axios.config';
import maleUser from '../../../assets/male-user.png';
import Avatar from '../../../components/common/Avatar';

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter States
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('1');
  const [admissionDate, setAdmissionDate] = useState('');
  
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, total: 0 });

  // Academic Masters for dropdowns
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Active Dropdown for Cards
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    admission_number: '',
    roll_number: '',
    class_id: '',
    section_id: '',
    gender: 'Male',
    date_of_birth: '',
    primary_contact_number: '',
    email_address: '',
    blood_group: '',
  });

  const SERVER_BASE_URL = 'http://localhost:5000';

  const getStudentImageUrl = (student) => {
    const pic = typeof student === 'object' ? student?.picture : student;
    const gender = typeof student === 'object' ? (student?.gender || student?.gender_name) : null;
    const fallbackImage = (gender === 'Female' || gender === '2')
      ? '/vidya_assets/images/female-user.png'
      : maleUser;

    if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined' || String(pic).startsWith('blob:')) {
      return fallbackImage;
    }
    const cleanPic = String(pic).trim();
    if (cleanPic.startsWith('data:') || cleanPic.startsWith('http://') || cleanPic.startsWith('https://')) {
      return cleanPic;
    }
    if (cleanPic.startsWith('/upload/')) return `${SERVER_BASE_URL}${cleanPic}`;
    if (cleanPic.startsWith('upload/')) return `${SERVER_BASE_URL}/${cleanPic}`;
    if (cleanPic.startsWith('/vidya_assets/')) return cleanPic;
    if (cleanPic.startsWith('vidya_assets/')) return `/${cleanPic}`;
    if (cleanPic.startsWith('/')) return `${SERVER_BASE_URL}${cleanPic}`;
    return `${SERVER_BASE_URL}/upload/${cleanPic}`;
  };

  const fetchStudents = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/students', {
        params: {
          search,
          classId,
          sectionId,
          status,
          admissionDate,
          page: pageNumber,
          limit: pagination.limit,
        },
      });

      if (res.data?.success) {
        setStudents(res.data.data.students || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 12, totalPages: 1, total: 0 });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch student records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicMasters = async () => {
    try {
      const classesRes = await apiClient.get('/admin/academics/classes');
      const classes = Array.isArray(classesRes.data?.data) ? classesRes.data.data : [];
      setClassList(classes);
      setFilteredSections([]); // Sections remain empty until a class is selected
    } catch (error) {
      console.error('Failed to load academic classes:', error);
    }
  };

  useEffect(() => {
    fetchAcademicMasters();
    fetchStudents(1);
  }, []);

  const handleClassChange = async (selectedClassId) => {
    setClassId(selectedClassId);
    setSectionId('');
    if (selectedClassId) {
      try {
        const res = await apiClient.get('/admin/academics/sections', {
          params: { classId: selectedClassId },
        });
        const sections = Array.isArray(res.data?.data) ? res.data.data : [];
        setFilteredSections(sections);
      } catch (err) {
        console.error('Failed to fetch sections for selected class:', err);
        setFilteredSections([]);
      }
    } else {
      setFilteredSections([]); // Reset to empty when no class selected
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchStudents(newPage);
    }
  };

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      first_name: '',
      last_name: '',
      admission_number: `ADM${Date.now().toString().slice(-6)}`,
      roll_number: '',
      class_id: classList[0]?.id || '',
      section_id: sectionList[0]?.id || '',
      gender: 'Male',
      date_of_birth: '',
      primary_contact_number: '',
      email_address: '',
      blood_group: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      admission_number: student.admission_number || '',
      roll_number: student.roll_number || '',
      class_id: student.class_id || '',
      section_id: student.section_id || '',
      gender: student.gender || 'Male',
      date_of_birth: student.date_of_birth ? student.date_of_birth.slice(0, 10) : '',
      primary_contact_number: student.primary_contact_number || '',
      email_address: student.email_address || '',
      blood_group: student.blood_group || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.class_id) {
      toast.error('First Name and Class selection are required.');
      return;
    }

    try {
      if (editingStudent) {
        const res = await apiClient.put(`/admin/students/${editingStudent.id}`, formData);
        if (res.data?.success) {
          toast.success('Student record updated successfully!');
          setShowModal(false);
          fetchStudents(pagination.page);
        }
      } else {
        const res = await apiClient.post('/admin/students', formData);
        if (res.data?.success) {
          toast.success('Student added successfully!');
          setShowModal(false);
          fetchStudents(1);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed. Please try again.');
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await apiClient.delete(`/admin/students/${studentId}`);
      if (res.data?.success) {
        toast.success('Student record deleted successfully.');
        fetchStudents(pagination.page);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Students</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="/admin/dashboard">Dashboard</a>
              </li>
              <li className="breadcrumb-item">Ward</li>
              <li className="breadcrumb-item active" aria-current="page">Students</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2">
            <button
              className="btn btn-primary d-flex align-items-center"
              onClick={() => navigate('/admin/students/add')}
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Student
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form onSubmit={handleSearchSubmit} className="row w-100">
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Student Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Class</label>
              <select
                className="form-select"
                name="class"
                id="class"
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Select</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>{c.class_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Section</label>
              <select
                className="form-select"
                name="section"
                id="section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">Select</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.section_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>
          </div>
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Admission Date</label>
              <input
                type="date"
                name="date"
                id="date"
                className="form-control"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-2 d-flex align-items-center mb-3">
            <button type="submit" className="btn btn-outline-primary w-100">Search</button>
          </div>
        </form>
      </div>
      {/* /Filter */}

      {/* Student Cards Grid */}
      <div className="row" id="studentCardDiv">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading students...</span>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <i className="ti ti-users-minus fs-32 mb-2 d-block"></i>
            No student records found matching your filters.
          </div>
        ) : (
          students.map((student) => (
            <div className="col-xxl-3 col-xl-4 col-md-6 d-flex" key={student.id}>
              <input type="hidden" name="student" className="studentId" value={student.id} />
              <div className="card flex-fill">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <Link to={`/admin/students/${student.id}`} className="link-primary fw-semibold">
                    {student.admission_number || `ADM-${student.id}`}
                  </Link>
                  <div className="d-flex align-items-center">
                    <div className="dropdown position-relative">
                      <button
                        type="button"
                        className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0 border-0"
                        onClick={(e) => toggleDropdown(student.id, e)}
                      >
                        <i className="ti ti-dots-vertical fs-14"></i>
                      </button>
                      {activeDropdown === student.id && (
                        <ul className="dropdown-menu dropdown-menu-end show p-2 shadow-sm position-absolute top-100 end-0 z-3" style={{ minWidth: '160px' }}>
                          <li>
                            <Link className="dropdown-item rounded-1" to={`/admin/students/edit/${student.id}`}>
                              <i className="ti ti-edit-circle me-2"></i>Edit
                            </Link>
                          </li>
                          <li>
                            <button className="dropdown-item rounded-1" onClick={() => toast.info('Promote student feature')}>
                              <i className="ti ti-arrow-ramp-right-2 me-2"></i>Promote Student
                            </button>
                          </li>
                          <li>
                            <button className="dropdown-item rounded-1 text-danger" onClick={() => handleDelete(student.id)}>
                              <i className="ti ti-trash-x me-2"></i>Delete
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="bg-light-300 rounded-2 p-3 mb-3">
                    <div className="d-flex align-items-center">
                      <Avatar
                        src={student.picture}
                        name={student.full_name}
                        size={45}
                        rounded={true}
                        className="me-2 flex-shrink-0"
                      />
                      <div className="ms-2">
                        <h5 className="mb-0 fs-15 font-weight-bold">
                          <Link to={`/admin/students/${student.id}`} className="text-dark">
                            {student.full_name}
                          </Link>
                        </h5>
                        <p className="text-muted mb-0 fs-13">
                          {student.class_name || 'N/A'}{student.section_name ? `, ${student.section_name}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gx-2 fs-13">
                    <div>
                      <p className="mb-0 text-muted">Roll No</p>
                      <p className="text-dark fw-medium mb-0">{student.roll_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-0 text-muted">Gender</p>
                      <p className="text-dark fw-medium mb-0">{student.gender || 'Male'}</p>
                    </div>
                    <div>
                      <p className="mb-0 text-muted">Joined On</p>
                      <p className="text-dark fw-medium mb-0">{formatDate(student.admission_date)}</p>
                    </div>
                  </div>
                </div>
                <div className="card-footer d-flex align-items-center justify-content-end">
                  <Link
                    to={`/admin/students/${student.id}`}
                    className="btn btn-outline-success btn-sm fw-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && students.length > 0 && (
        <div className="d-flex align-items-center justify-content-between my-4 px-2">
          <div className="fs-14 text-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
          </div>
          <ul className="pagination pagination-sm m-0">
            <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => handlePageChange(pagination.page - 1)}>Previous</button>
            </li>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
              </li>
            ))}
            <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => handlePageChange(pagination.page + 1)}>Next</button>
            </li>
          </ul>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  {editingStudent ? 'Edit Student Record' : 'Add New Student'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">First Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Admission Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.admission_number}
                        onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Roll Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.roll_number}
                        onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                        placeholder="e.g. 101"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Class <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        required
                        value={formData.class_id}
                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      >
                        <option value="">Select Class</option>
                        {classList.map((c) => (
                          <option key={c.id} value={c.id}>{c.class_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Section</label>
                      <select
                        className="form-select"
                        value={formData.section_id}
                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      >
                        <option value="">Select Section</option>
                        {filteredSections.map((s) => (
                          <option key={s.id} value={s.id}>{s.section_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Gender</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Blood Group</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. O+, A+"
                        value={formData.blood_group}
                        onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Primary Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter phone number"
                        value={formData.primary_contact_number}
                        onChange={(e) => setFormData({ ...formData, primary_contact_number: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Enter email address"
                        value={formData.email_address}
                        onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top px-4 py-3">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4">
                    {editingStudent ? 'Save Changes' : 'Create Student'}
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

export default StudentList;
