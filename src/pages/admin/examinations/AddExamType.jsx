import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminExaminationApi from '../../../api/adminExamination.api';
import { decodeParam } from '../../../utils/idHelper';
import { sortExamsDesc } from '../../../utils/dropdownSort.util';

const AddExamType = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedExamId = searchParams.get('exam_id') ? decodeParam(searchParams.get('exam_id')) : null;

  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const isEdit = Boolean(id);

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(preselectedExamId || '');
  const [examNameDisplay, setExamNameDisplay] = useState('');

  // For Add mode: Dynamic array of exam type rows
  const [rows, setRows] = useState([
    { exam_type: '', sort_order: 1, status: 1 },
  ]);

  // For Edit mode: Single exam type object
  const [editFormData, setEditFormData] = useState({
    exam_id: '',
    exam_type: '',
    sort_order: 1,
    status: 1,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const exRes = await adminExaminationApi.getAllExams({ status: 1 });
      if (exRes?.data?.exams) {
        const sortedExams = sortExamsDesc(exRes.data.exams);
        setExams(sortedExams);
        if (!isEdit && sortedExams.length > 0) {
          if (preselectedExamId && sortedExams.some((e) => String(e.id) === String(preselectedExamId))) {
            setSelectedExamId(preselectedExamId);
          } else if (!selectedExamId) {
            setSelectedExamId(sortedExams[0].id);
          }
        }
      }


      if (isEdit) {
        const etRes = await adminExaminationApi.getExamTypeById(id);
        if (etRes?.data?.examType) {
          const et = etRes.data.examType;
          setSelectedExamId(et.exam_id);
          setExamNameDisplay(et.exam_name || '');
          setEditFormData({
            exam_id: et.exam_id,
            exam_type: et.exam_type || '',
            sort_order: et.sort_order !== undefined ? et.sort_order : 1,
            status: et.status !== undefined ? et.status : 1,
          });
        } else {
          toast.error('Exam type not found.');
          navigate('/admin/examinations/exam-types');
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      toast.error(err.message || 'Failed to load exam type details');
      if (isEdit) navigate('/admin/examinations/exam-types');
    } finally {
      setLoading(false);
    }
  };

  // Add Row handlers (for Create mode)
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { exam_type: '', sort_order: prev.length + 1, status: 1 },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]:
          field === 'sort_order' || field === 'status'
            ? parseInt(value, 10) || 0
            : value,
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExamId) {
      toast.warning('Please select an Exam.');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        if (!editFormData.exam_type.trim()) {
          toast.warning('Please enter Exam Type Name.');
          return;
        }
        await adminExaminationApi.updateExamType(id, {
          exam_id: selectedExamId,
          exam_type: editFormData.exam_type.trim(),
          sort_order: editFormData.sort_order,
          status: editFormData.status,
        });
        toast.success(`Exam type "${editFormData.exam_type}" updated successfully!`);
      } else {
        const validRows = rows.filter((r) => r.exam_type.trim() !== '');
        if (validRows.length === 0) {
          toast.warning('Please enter at least one Exam Type.');
          return;
        }

        await adminExaminationApi.createExamType({
          exam_id: selectedExamId,
          items: validRows,
        });
        toast.success(`${validRows.length} Exam Type(s) added successfully!`);
      }

      navigate('/admin/examinations/exam-types');
    } catch (err) {
      console.error('Error saving exam type:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save exam type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Exam Type' : 'Add Exam Type'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/examinations/exam-types">Examination</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Exam Type' : 'Add Exam Type'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          {loading ? (
            <div className="card p-5 text-center">
              <div className="spinner-border text-primary mx-auto" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading exam type details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="card shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex align-items-center">
                    <h4 className="text-dark mb-0">Exam Type</h4>
                  </div>
                </div>

                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Exam <span className="text-danger">*</span>
                        </label>
                        {isEdit ? (
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={examNameDisplay || 'Exam'}
                            disabled
                          />
                        ) : (
                          <select
                            className="form-select"
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            required
                          >
                            <option value="">Select Exam</option>
                            {exams.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.exam_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEdit ? (
                    /* Edit Single Row */
                    <div className="row align-items-end p-2 bg-light rounded-2 mb-3">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">
                            Exam Type <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Theory, Practical, Assessment"
                            value={editFormData.exam_type}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                exam_type: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">
                            Sort Order <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={editFormData.sort_order}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                sort_order: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Status</label>
                          <select
                            className="form-select"
                            value={editFormData.status}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                status: parseInt(e.target.value, 10),
                              })
                            }
                          >
                            <option value="1">Active</option>
                            <option value="2">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dynamic Rows for Add Mode */
                    <div id="leaveRows">
                      {rows.map((row, index) => (
                        <div
                          key={index}
                          className="row align-items-end p-2 bg-light rounded-2 mb-3 g-3"
                        >
                          <div className="col-md-4">
                            <div>
                              <label className="form-label fw-semibold">
                                Exam Type <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Theory, Practical, Assessment"
                                value={row.exam_type}
                                onChange={(e) =>
                                  handleRowChange(index, 'exam_type', e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div>
                              <label className="form-label fw-semibold">
                                Sort Order <span className="text-danger">*</span>
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                value={row.sort_order}
                                onChange={(e) =>
                                  handleRowChange(index, 'sort_order', e.target.value)
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div>
                              <label className="form-label fw-semibold">Status</label>
                              <select
                                className="form-select"
                                value={row.status}
                                onChange={(e) =>
                                  handleRowChange(index, 'status', e.target.value)
                                }
                              >
                                <option value="1">Active</option>
                                <option value="2">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-md-2 d-flex align-items-end">
                            {rows.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-icon w-100"
                                onClick={() => handleRemoveRow(index)}
                                title="Remove Row"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="mb-3 pt-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary d-inline-flex align-items-center"
                          onClick={handleAddRow}
                        >
                          <i className="ti ti-circle-plus me-2"></i>Add New
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-end mb-2 pe-3 pb-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/examinations/exam-types')}
                    className="btn btn-light me-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExamType;
