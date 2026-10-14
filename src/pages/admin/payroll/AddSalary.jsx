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

  const loadEmployees = useCallback(async (type, paymentDate) => {
    try {
      setLoading(true);
      const res = await fetchEmployeesByTypeApi(type, {
        payment_date: paymentDate,
      });
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
      total_deductions: '0.00',
      net_salary: '',
    }));
    setNameSearch('');
    if (val) {
      loadEmployees(val, formData.payment_date);
    } else {
      setEmployees([]);
    }
  };

  const handleSelectEmployee = (empId) => {
    const selectedEmp = employees.find((emp) => String(emp.id) === String(empId));

    if (selectedEmp) {
      if (selectedEmp.is_beneficiary_verified === false) {
        toast.warning(
          `${selectedEmp.name} is ineligible: ${(selectedEmp.beneficiary_issues || []).join(', ')}.`
        );
      }
      const basic = selectedEmp.basic_salary ? Number(selectedEmp.basic_salary).toFixed(2) : '0.00';
      const leaveDed = Number(selectedEmp.leave_deduction_amount || 0);
      const deductions = leaveDed.toFixed(2);
      const net = Math.max(0, Number(basic) - leaveDed).toFixed(2);

      setFormData((prev) => ({
        ...prev,
        employee_id: String(empId),
        leave_id: selectedEmp.primary_leave_id || '',
        basic_salary: basic,
        total_deductions: deductions,
        net_salary: net,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employee_id: '',
        leave_id: '',
        basic_salary: '',
        total_deductions: '0.00',
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

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const prevMonth = (formData.payment_date || '').slice(0, 7);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'payment_date' && formData.user_type && value.slice(0, 7) !== prevMonth) {
      try {
        setLoading(true);
        const res = await fetchEmployeesByTypeApi(formData.user_type, { payment_date: value });
        const list = res?.data?.employees || res?.employees || [];
        setEmployees(list);
        if (formData.employee_id) {
          const updatedEmp = list.find((emp) => String(emp.id) === String(formData.employee_id));
          if (updatedEmp) {
            const basic = Number(updatedEmp.basic_salary || formData.basic_salary || 0);
            const leaveDed = Number(updatedEmp.leave_deduction_amount || 0);
            setFormData((prev) => ({
              ...prev,
              leave_id: updatedEmp.primary_leave_id || '',
              total_deductions: leaveDed.toFixed(2),
              net_salary: Math.max(0, basic - leaveDed).toFixed(2),
            }));
          }
        }
      } catch (err) {
        console.error('Error refreshing leave deductions for month:', err);
      } finally {
        setLoading(false);
      }
    }
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

  const selectedEmployeeObj = useMemo(() => {
    return employees.find((e) => String(e.id) === String(formData.employee_id)) || null;
  }, [employees, formData.employee_id]);

  const selectedEmployeeName = selectedEmployeeObj ? selectedEmployeeObj.name : '';

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
    if (selectedEmployeeObj && selectedEmployeeObj.is_beneficiary_verified === false) {
      toast.error(
        `Cannot process salary: ${(selectedEmployeeObj.beneficiary_issues || []).join(', ')}. Please verify beneficiary & bank details first.`
      );
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
                        <option value="1">Staff</option>
                        <option value="2">Teacher</option>
                        <option value="3">Driver</option>
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
                                  <span className="d-inline-flex align-items-center gap-1">
                                    {emp.is_beneficiary_verified ? (
                                      <span className="badge bg-success-subtle text-success fs-10">Verified</span>
                                    ) : (
                                      <span className="badge bg-danger-subtle text-danger fs-10">Ineligible</span>
                                    )}
                                    {String(formData.employee_id) === String(emp.id) && (
                                      <i className="ti ti-check text-primary fs-14"></i>
                                    )}
                                  </span>
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

                {selectedEmployeeObj && (
                  <div className="row mt-2 mb-3">
                    <div className="col-12">
                      <div
                        className={`p-3 rounded-2 border ${
                          selectedEmployeeObj.is_beneficiary_verified
                            ? 'bg-light border-success-subtle'
                            : 'bg-danger-subtle border-danger'
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <div>
                            <span className="fw-bold text-dark me-2">{selectedEmployeeObj.name}</span>
                            {selectedEmployeeObj.is_beneficiary_verified ? (
                              <span className="badge bg-success text-white">
                                <i className="ti ti-circle-check me-1"></i>Beneficiary Verified ({selectedEmployeeObj.bank_name} • A/C: {selectedEmployeeObj.account_no} • IFSC: {selectedEmployeeObj.ifsc_code})
                              </span>
                            ) : (
                              <span className="badge bg-danger text-white">
                                <i className="ti ti-alert-triangle me-1"></i>
                                Ineligible: {(selectedEmployeeObj.beneficiary_issues || []).join(', ')}
                              </span>
                            )}
                          </div>
                          {!selectedEmployeeObj.is_beneficiary_verified && (
                            <Link
                              to="/admin/payroll/beneficiaries/add"
                              className="btn btn-sm btn-outline-danger"
                            >
                              Add / Verify Beneficiary
                            </Link>
                          )}
                        </div>
                        <div className="d-flex flex-wrap gap-4 mt-2 pt-2 border-top small text-muted">
                          <div>
                            <strong>Salary Period:</strong> {selectedEmployeeObj.salary_month} ({selectedEmployeeObj.days_in_month} days)
                          </div>
                          <div>
                            <strong>Paid Leave:</strong> {Number(selectedEmployeeObj.paid_leave_days || 0)} day(s)
                          </div>
                          <div>
                            <strong>Unpaid Leave:</strong>{' '}
                            <span className={Number(selectedEmployeeObj.unpaid_leave_days || 0) > 0 ? 'text-danger fw-bold' : 'text-dark'}>
                              {Number(selectedEmployeeObj.unpaid_leave_days || 0)} day(s)
                            </span>
                          </div>
                          <div>
                            <strong>Leave-Based Deduction:</strong>{' '}
                            <span className="text-danger fw-bold">
                              ₹{Number(selectedEmployeeObj.leave_deduction_amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={submitting || (selectedEmployeeObj && !selectedEmployeeObj.is_beneficiary_verified)}
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
