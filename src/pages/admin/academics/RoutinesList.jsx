import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchClassesApi, fetchShiftsApi } from '../../../api/adminAcademic.api';
import { encodeParam } from '../../../utils/idHelper';

const RoutinesList = () => {
  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShiftsAndClasses();
  }, []);

  const fetchShiftsAndClasses = async () => {
    try {
      setLoading(true);
      const [shiftsRes, classesRes] = await Promise.all([
        fetchShiftsApi().catch(() => ({ data: [] })),
        fetchClassesApi().catch(() => ({ data: [] })),
      ]);

      const shiftList = Array.isArray(shiftsRes?.data) ? shiftsRes.data : Array.isArray(shiftsRes) ? shiftsRes : [];
      const classList = Array.isArray(classesRes?.data) ? classesRes.data : Array.isArray(classesRes) ? classesRes : [];

      setShifts(shiftList.filter((s) => s.status === 1));
      setClasses(classList.filter((c) => c.status === 1));
    } catch (err) {
      toast.error('Failed to load class routine shifts.');
    } finally {
      setLoading(false);
    }
  };

  // Group classes by shift
  const groupedShifts = shifts.map((shift) => {
    const shiftClasses = classes.filter(
      (c) => Number(c.shift_id) === Number(shift.id) || (c.shift_name && c.shift_name.trim() === shift.shift_name.trim())
    );
    return {
      ...shift,
      classes: shiftClasses,
    };
  });

  // Handle any classes without an assigned shift
  const unassignedClasses = classes.filter(
    (c) => !shifts.some((s) => Number(s.id) === Number(c.shift_id) || (c.shift_name && c.shift_name.trim() === s.shift_name.trim()))
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Routine</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/routines">Academic</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Routine
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchShiftsAndClasses}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Routine Content */}
      <div className="p-0 py-3">
        {loading ? (
          <div className="card p-5 text-center shadow-sm">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading class routine structure...</p>
          </div>
        ) : shifts.length === 0 && classes.length === 0 ? (
          <div className="card shadow-sm border p-5 text-center">
            <div className="py-4">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '72px',
                  height: '72px',
                  backgroundColor: 'rgba(13, 110, 253, 0.08)',
                  color: '#0d6efd',
                  fontSize: '32px',
                }}
              >
                <i className="ti ti-calendar-time"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">No Class Routines Configured</h5>
              <p className="text-muted fs-14 mb-4 mx-auto" style={{ maxWidth: '460px' }}>
                No shifts or classes have been set up yet. Create shifts and classes in Academics to start scheduling routines.
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Link to="/admin/academics/classes" className="btn btn-primary">
                  <i className="ti ti-school me-1"></i> Add Classes
                </Link>
                <Link to="/admin/academics/shifts" className="btn btn-outline-primary">
                  <i className="ti ti-clock me-1"></i> Add Shifts
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {groupedShifts.map((shift) => (
              <div key={shift.id} className="card shift-card mb-4 shadow-sm border">
                <div className="card-header shift-header bg-light py-3 px-4 border-bottom">
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-clock me-2 text-primary fs-18"></i>
                    Shift : {shift.shift_name ? shift.shift_name.trim() : `Shift ${shift.id}`}
                  </h5>
                </div>

                <div className="card-body p-4">
                  <div className="row g-3">
                    {shift.classes.length > 0 ? (
                      shift.classes.map((cls) => (
                        <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                          <Link
                            to={`/admin/academics/routines/section/${encodeParam(cls.id)}`}
                            className="text-decoration-none"
                          >
                            {/* Class Card */}
                            <div className="class-card text-center p-4 rounded-3 border bg-white shadow-sm transition-all hover-elevate">
                              <div
                                className="class-icon mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  backgroundColor: 'rgba(13, 110, 253, 0.08)',
                                  color: '#0d6efd',
                                  fontSize: '24px',
                                }}
                              >
                                <i className="ti ti-school"></i>
                              </div>
                              <h6 className="mb-0 text-dark fw-bold fs-16">{cls.class_name}</h6>
                            </div>
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="col-12 py-3 text-muted text-center">
                        <p className="mb-2">No classes currently mapped to this shift.</p>
                        <Link to="/admin/academics/classes" className="btn btn-sm btn-outline-primary">
                          <i className="ti ti-plus me-1"></i> Add / Map Classes
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {unassignedClasses.length > 0 && (
              <div className="card shift-card mb-4 shadow-sm border">
                <div className="card-header shift-header bg-light py-3 px-4 border-bottom">
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-clock me-2 text-primary fs-18"></i>
                    Other Classes
                  </h5>
                </div>

                <div className="card-body p-4">
                  <div className="row g-3">
                    {unassignedClasses.map((cls) => (
                      <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                        <Link
                          to={`/admin/academics/routines/section/${encodeParam(cls.id)}`}
                          className="text-decoration-none"
                        >
                          <div className="class-card text-center p-4 rounded-3 border bg-white shadow-sm transition-all hover-elevate">
                            <div
                              className="class-icon mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                              style={{
                                width: '56px',
                                height: '56px',
                                backgroundColor: 'rgba(13, 110, 253, 0.08)',
                                color: '#0d6efd',
                                fontSize: '24px',
                              }}
                            >
                              <i className="ti ti-school"></i>
                            </div>
                            <h6 className="mb-0 text-dark fw-bold fs-16">{cls.class_name}</h6>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* /Routine Content */}

      <style>{`
        .hover-elevate {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .hover-elevate:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08) !important;
          border-color: #0d6efd !important;
        }
      `}</style>
    </div>
  );
};

export default RoutinesList;
