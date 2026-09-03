import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchBeneficiaryByIdApi,
  createBeneficiaryApi,
  updateBeneficiaryApi,
  fetchEmployeesByTypeApi,
} from '../../../api/adminPayroll.api';
import { decodeParam } from '../../../utils/idHelper';

const EditBeneficiary = () => {
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    user_type: '1',
    employee_id: '',
    basic_salary: '',
    bank_name: '',
    account_name: '',
    account_no: '',
    ifsc_code: '',
    branch_name: '',
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Custom searchable scrollable dropdown state
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const dropdownRef = useRef(null);

  // Load employee list when user_type changes
  const loadEmployees = useCallback(async (type) => {
    try {
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
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res = await fetchBeneficiaryByIdApi(id);
          const b = res?.data?.beneficiary || res?.beneficiary;
          if (b) {
            const uType = String(b.user_type || '1');
            setFormData({
              user_type: uType,
              employee_id: String(b.employee_id || ''),
              basic_salary: b.amount ? Number(b.amount).toFixed(2) : '',
              bank_name: b.bank_name || '',
              account_name: b.account_holder_name || b.name || '',
              account_no: b.account_number || '',
              ifsc_code: b.ifsc_code || '',
              branch_name: b.branch_name || '',
            });
            await loadEmployees(uType);
          } else {
            toast.error('Beneficiary record not found.');
            navigate('/admin/payroll/beneficiaries');
          }
        } else {
          await loadEmployees('1');
        }
      } catch (err) {
        console.error('Error initializing form:', err);
        toast.error('Failed to load beneficiary data.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEdit, navigate, loadEmployees]);

  // Close dropdown on outside click
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

  const handleUserTypeChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      user_type: val,
      employee_id: '',
      bank_name: '',
      account_name: '',
      account_no: '',
      ifsc_code: '',
      branch_name: '',
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
      setFormData((prev) => ({
        ...prev,
        employee_id: String(empId),
        bank_name: selectedEmp.bank_name || prev.bank_name || '',
        account_name: selectedEmp.account_name || selectedEmp.name || prev.account_name || '',
        account_no: selectedEmp.account_no || prev.account_no || '',
        ifsc_code: selectedEmp.ifsc_code || prev.ifsc_code || '',
        branch_name: selectedEmp.branch_name || prev.branch_name || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employee_id: '',
      }));
    }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
      toast.error('Please enter a valid Basic Salary Amount.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateBeneficiaryApi(id, formData);
        toast.success('Beneficiary updated successfully.');
      } else {
        await createBeneficiaryApi(formData);
        toast.success('Beneficiary added successfully.');
      }
      navigate('/admin/payroll/beneficiaries');
    } catch (err) {
      console.error('Error saving beneficiary:', err);
      toast.error(err?.response?.data?.message || 'Failed to save beneficiary.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">Benificiary Settings</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/payroll/beneficiaries">Benificiary Settings</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Benificiary' : 'Add Benificiary'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary me-2" role="status"></div>
                <span className="text-muted">Loading beneficiary information...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Benificiary</h4>
                  </div>
                </div>
                <div className="card-body pb-1">
                  <div className="row row-cols-md-6">
                    <div className="col-md-4">
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

                    <div className="col-md-4">
                      <div className="mb-3" ref={dropdownRef} style={{ position: 'relative' }}>
                        <label className="form-label">
                          Name <span className="text-danger">*</span>
                        </label>
                        <div
                          className={`form-select d-flex align-items-center justify-content-between cursor-pointer ${
                            !formData.employee_id ? 'text-muted' : 'text-dark'
                          }`}
                          onClick={() => setIsNameDropdownOpen((prev) => !prev)}
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

                        {/* Custom Searchable Scrollable Dropdown Menu */}
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
                            {/* Search Filter Input */}
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

                            {/* Scrollable Option List */}
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
                              {filteredEmployees.length === 0 ? (
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
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Amount <span className="text-danger">*</span>
                        </label>
                        <div className="date-pic">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Amount"
                            name="basic_salary"
                            id="basic_salary"
                            value={formData.basic_salary}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <h4 className="text-dark mb-3">Bank Details</h4>
                    <hr />

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Bank Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Bank Name"
                          name="bank_name"
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Account Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Account Name"
                          name="account_name"
                          id="account_name"
                          value={formData.account_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Account No <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Account No"
                          name="account_no"
                          id="account_no"
                          value={formData.account_no}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          IFSC Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="IFSC Code"
                          name="ifsc_code"
                          id="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Branch Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Branch Name"
                          name="branch_name"
                          id="branch_name"
                          value={formData.branch_name}
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
                    onClick={() => navigate('/admin/payroll/beneficiaries')}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EditBeneficiary;
