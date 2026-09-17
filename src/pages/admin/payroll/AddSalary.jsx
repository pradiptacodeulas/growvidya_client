import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchEmployeesByTypeApi, createSalaryApi } from '../../../api/adminPayroll.api';

const AddSalary = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_type: '',
    employee_id: '',
    leave_id: '',
    basic_salary: '',
    total_deductions: '0.00',
    net_salary: '',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    slip: null,
    payment_status: 1,
  });

  const [slipPreview, setSlipPreview] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Searchable scrollable dropdown state
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsNameDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const loadEmployees = useCallback(async (type) => {
    try {
      setLoading(true);
      const res = await fetchEmployeesByTypeApi(type);
      if (res?.data?.employees) {
        setEmployees(res.data.employees);
      } else if (res?.employees) {
        setEmployees(res.employees);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUserTypeChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      user_type: val,
      employee_id: '',
      leave_id: '',
      basic_salary: '',
      net_salary: '',
    }));
    setNameSearch('');
    if (val) {
      loadEmployees(val);
    } else {
      setEmployees([]);
    }
  };

  const handleSelectEmployee = (empId) => {
    const selectedEmp = employees.find((emp) => String(emp.id) === String(empId));

    if (selectedEmp) {
      const basic = selectedEmp.basic_salary ? Number(selectedEmp.basic_salary).toFixed(2) : '0.00';
      const deductions = Number(formData.total_deductions) || 0;
      const net = Math.max(0, Number(basic) - deductions).toFixed(2);

      setFormData((prev) => ({
        ...prev,
        employee_id: String(empId),
        leave_id: selectedEmp.id,
        basic_salary: basic,
        net_salary: net,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employee_id: '',
        leave_id: '',
        basic_salary: '',
        net_salary: '',
      }));
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    const basic = Number(val) || 0;
    const deductions = Number(formData.total_deductions) || 0;
    const net = Math.max(0, basic - deductions).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      basic_salary: val,
      net_salary: net,
    }));
  };

  const handleDeductionsChange = (e) => {
    const val = e.target.value;
    const basic = Number(formData.basic_salary) || 0;
    const deductions = Number(val) || 0;
    const net = Math.max(0, basic - deductions).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      total_deductions: val,
      net_salary: net,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('File size must not exceed 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSlipPreview(reader.result);
      setFormData((prev) => ({ ...prev, slip: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSlipPreview(null);
    setFormData((prev) => ({ ...prev, slip: null }));
  };

  const filteredEmployees = useMemo(() => {
    if (!nameSearch.trim()) return employees;
    const q = nameSearch.toLowerCase();
    return employees.filter((emp) => (emp.name || '').toLowerCase().includes(q));
  }, [employees, nameSearch]);

  const selectedEmployeeName = useMemo(() => {
    const emp = employees.find((e) => String(e.id) === String(formData.employee_id));
    return emp ? emp.name : '';
  }, [employees, formData.employee_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_type) {
      toast.error('Please select User Type.');
      return;
    }
    if (!formData.employee_id) {
      toast.error('Please select Employee Name.');
      return;
    }
    if (!formData.basic_salary || isNaN(formData.basic_salary) || Number(formData.basic_salary) <= 0) {
      toast.error('Please enter a valid Amount.');
      return;
    }
    if (!formData.transaction_id) {
      toast.error('Please enter Transaction No.');
      return;
    }
    if (!formData.payment_date) {
      toast.error('Please select Payment Date.');
      return;
    }

    try {
      setSubmitting(true);
      await createSalaryApi(formData);
      toast.success('Salary record created successfully.');
      navigate('/admin/payroll/salary');
    } catch (err) {
      console.error('Error creating salary record:', err);
      toast.error(err?.response?.data?.message || 'Failed to create salary record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Add Salary</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/payroll/salary">Salary</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Add Salary
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
                  <h4 className="text-dark mb-0">Salary</h4>
                </div>
              </div>
              <div className="card-body pb-1">
                {/* Slip Upload Row */}
                <div className="row">
                  <div className="col-md-12">
                    <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3 profile-uploader-div">
                      <div
                        style={{
                          width: '200px',
                          height: '200px',
                          border: '2px dashed #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                        className="profile-uploader-img d-flex align-items-center justify-content-center me-3 flex-shrink-0 text-dark bg-light"
                      >
                        {slipPreview ? (
                          <img
                            src={slipPreview}
                            alt="Slip Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div className="text-center p-3">
                            <i className="ti ti-photo-plus fs-36 text-muted mb-2 d-block"></i>
                            <span className="text-muted fs-12">No Slip Uploaded</span>
                          </div>
                        )}
                      </div>
                      <div className="profile-upload personal-image-upload">
                        <div className="profile-uploader d-flex align-items-center">
                          <div className="drag-upload-btn mb-3 me-2">
                            <label className="btn btn-primary mb-0 cursor-pointer d-inline-flex align-items-center">
                              <i className="ti ti-upload me-2"></i>Upload
                              <input
                                type="file"
                                name="slip"
                                className="d-none"
                                onChange={handleImageChange}
                                accept="image/jpeg,image/png,image/jpg,application/pdf"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={removeImage}
                            className="btn btn-light mb-3"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="fs-12 text-muted">
                          Upload image size 4MB, Format JPG, PNG, JPEG
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row row-cols-md-6">
                  {/* Type */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="user_type"
                        id="user_type"
                        value={formData.user_type}
                        onChange={handleUserTypeChange}
                        required
                      >
                        <option value="">Select</option>
                        <option value="1">User</option>
                        <option value="2">Teacher</option>
                      </select>
                    </div>
                  </div>

                  {/* Name (Searchable Scrollable Dropdown) */}
                  <div className="col-md-3">
                    <div className="mb-3" ref={dropdownRef} style={{ position: 'relative' }}>
                      <label className="form-label">
                        Name <span className="text-danger">*</span>
                      </label>
                      <div
                        className={`form-select d-flex align-items-center justify-content-between cursor-pointer ${
                          !formData.employee_id ? 'text-muted' : 'text-dark'
                        }`}
                        onClick={() => {
                          if (!formData.user_type) {
                            toast.info('Please select Type first.');
                            return;
                          }
                          setIsNameDropdownOpen((prev) => !prev);
                        }}
                        style={{
                          minHeight: '38px',
                          backgroundColor: '#fff',
                          userSelect: 'none',
                        }}
                      >
                        <span className="text-truncate">
                          {selectedEmployeeName || 'Select'}
                        </span>
                      </div>

                      {isNameDropdownOpen && (
                        <div
                          className="dropdown-menu show w-100 p-2 shadow-sm border mt-1"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 1050,
                            borderRadius: '6px',
                            backgroundColor: '#fff',
                          }}
                        >
                          <div className="mb-2">
                            <input
                              type="search"
                              className="form-control form-control-sm"
                              placeholder="Search employee..."
                              value={nameSearch}
                              onChange={(e) => setNameSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>

                          <div
                            style={{
                              maxHeight: '220px',
                              overflowY: 'auto',
                              scrollbarWidth: 'thin',
                            }}
                          >
                            <div
                              className={`dropdown-item rounded-1 py-2 px-2 cursor-pointer ${
                                !formData.employee_id ? 'bg-light text-primary fw-semibold' : ''
                              }`}
                              onClick={() => {
                                handleSelectEmployee('');
                                setIsNameDropdownOpen(false);
                                setNameSearch('');
                              }}
                            >
                              Select
                            </div>
                            {loading ? (
                              <div className="text-muted text-center py-2 small">
                                Loading...
                              </div>
                            ) : filteredEmployees.length === 0 ? (
                              <div className="text-muted text-center py-2 small">
                                No matching employees found
                              </div>
                            ) : (
                              filteredEmployees.map((emp) => (
                                <div
                                  key={emp.id}
                                  className={`dropdown-item rounded-1 py-2 px-2 cursor-pointer d-flex align-items-center justify-content-between ${
                                    String(formData.employee_id) === String(emp.id)
                                      ? 'bg-light text-primary fw-semibold'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    handleSelectEmployee(emp.id);
                                    setIsNameDropdownOpen(false);
                                    setNameSearch('');
                                  }}
                                >
                                  <span>{emp.name}</span>
                                  {String(formData.employee_id) === String(emp.id) && (
                                    <i className="ti ti-check text-primary fs-14"></i>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                      <input
                        type="hidden"
                        name="employee_id"
                        value={formData.employee_id}
                        required
                      />
                      <input
                        type="hidden"
                        name="leave_id"
                        value={formData.leave_id}
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Amount <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Amount"
                        name="basic_salary"
                        id="basic_salary"
                        value={formData.basic_salary}
                        onChange={handleAmountChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Total Deductions */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Total Deductions <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Total Deductions"
                        name="total_deductions"
                        id="total_deductions"
                        value={formData.total_deductions}
                        onChange={handleDeductionsChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Net Salary <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Net Salary"
                        name="net_salary"
                        id="net_salary"
                        value={formData.net_salary}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Transaction No */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Transaction No <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Transaction No"
                        name="transaction_id"
                        id="transaction_id"
                        value={formData.transaction_id}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Payment Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="payment_date"
                        id="payment_date"
                        value={formData.payment_date}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-end mb-2 p-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/payroll/salary')}
                  className="btn btn-light me-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
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

export default AddSalary;
